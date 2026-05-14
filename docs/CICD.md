# CI/CD

Three GitHub Actions workflows under `.github/workflows/` drive the pipeline:

| Workflow | Purpose | Trigger | Needs Azure auth |
|---|---|---|---|
| `ci.yml` | Build verification (API + test, web, Docker, terraform validate) | PR/push to `v2` or `main` touching `api/**`, `web/**`, `infra/**` | No |
| `deploy.yml` | Build images → push to ACR → roll Container App revisions | Push to `v2`/`main` touching `api/**` or `web/**`, or manual | Yes (OIDC) |
| `infra.yml` | `terraform plan` / `apply` / `destroy` on `infra/azure` | Manual only | Yes (OIDC) |

The split keeps two contracts clean:

- **Terraform owns infrastructure shape.** Container Apps have `lifecycle.ignore_changes = [image]` so the deploy workflow can roll new image tags without fighting state.
- **Deploy workflow owns the image roll.** It uses `az containerapp update --image`, which is idempotent and doesn't require a Terraform state lock.

## One-time setup

### 1. Create an Entra app + UAMI for deploys

```bash
# Adjust as needed
RG=rg-hoptx-prod
APP_NAME=github-hoptranscribe

# Create app registration (or use an existing UAMI in your tenant)
APP_ID=$(az ad app create --display-name "$APP_NAME" --query appId -o tsv)
SP_OBJECT_ID=$(az ad sp create --id "$APP_ID" --query id -o tsv)

# Grant it Contributor + User Access Administrator on the subscription
SUB_ID=$(az account show --query id -o tsv)
az role assignment create --assignee-object-id "$SP_OBJECT_ID" --assignee-principal-type ServicePrincipal --role Contributor --scope "/subscriptions/$SUB_ID"
az role assignment create --assignee-object-id "$SP_OBJECT_ID" --assignee-principal-type ServicePrincipal --role "User Access Administrator" --scope "/subscriptions/$SUB_ID"
```

> `User Access Administrator` is required so Terraform can assign `AcrPull`, `Key Vault Secrets User`, and `Key Vault Secrets Officer`. Scope it as tightly as you can (subscription is the broadest acceptable).

### 2. Federate to GitHub

```bash
REPO=bridan234/HOPTranscribe

az ad app federated-credential create --id "$APP_ID" --parameters "{
  \"name\":\"github-v2-branch\",
  \"issuer\":\"https://token.actions.githubusercontent.com\",
  \"subject\":\"repo:$REPO:ref:refs/heads/v2\",
  \"audiences\":[\"api://AzureADTokenExchange\"]
}"

# Optional: federation for pull_request events too
az ad app federated-credential create --id "$APP_ID" --parameters "{
  \"name\":\"github-pr\",
  \"issuer\":\"https://token.actions.githubusercontent.com\",
  \"subject\":\"repo:$REPO:pull_request\",
  \"audiences\":[\"api://AzureADTokenExchange\"]
}"
```

### 3. Bootstrap the Terraform state backend (once)

```bash
LOC=eastus
TF_RG=rg-hoptx-tfstate
TF_SA=sthoptxtfstate$RANDOM   # globally unique

az group create -n "$TF_RG" -l "$LOC"
az storage account create -n "$TF_SA" -g "$TF_RG" -l "$LOC" --sku Standard_LRS --kind StorageV2
az storage container create -n tfstate --account-name "$TF_SA" --auth-mode login

# Grant deploy principal Storage Blob Data Contributor on the SA
SA_ID=$(az storage account show -n "$TF_SA" -g "$TF_RG" --query id -o tsv)
az role assignment create --assignee-object-id "$SP_OBJECT_ID" --assignee-principal-type ServicePrincipal --role "Storage Blob Data Contributor" --scope "$SA_ID"
```

### 4. Configure GitHub secrets and variables

**Repository secrets** (`Settings → Secrets and variables → Actions → Secrets`):

| Name | Value |
|---|---|
| `AZURE_CLIENT_ID` | `$APP_ID` |
| `AZURE_TENANT_ID` | `az account show --query tenantId -o tsv` |
| `AZURE_SUBSCRIPTION_ID` | `$SUB_ID` |
| `OPENAI_API_KEY` | your OpenAI API key (re-used by `infra.yml` as `TF_VAR_openai_api_key`) |

**Repository variables** (`Settings → Secrets and variables → Actions → Variables`):

| Name | Example |
|---|---|
| `TF_BACKEND_RESOURCE_GROUP` | `rg-hoptx-tfstate` |
| `TF_BACKEND_STORAGE_ACCOUNT` | `sthoptxtfstate123` |
| `TF_BACKEND_CONTAINER` | `tfstate` |
| `TF_BACKEND_KEY` | `prod.tfstate` |
| `TF_VAR_NAME_PREFIX` | `hoptx` |
| `TF_VAR_ENV` | `prod` |
| `TF_VAR_LOCATION` | `eastus` |
| `TF_VAR_ALLOWED_ORIGINS` | `https://app.example.com` |

After the first `infra.yml` apply completes, also set:

| Name | Source (from `terraform output`) |
|---|---|
| `AZURE_RESOURCE_GROUP` | `resource_group_name` |
| `ACR_LOGIN_SERVER` | `acr_login_server` |
| `API_APP_NAME` | derived from `api_fqdn` (first label before first dot) |
| `WEB_APP_NAME` | derived from `web_fqdn` |
| `API_URL` | `api_url` |
| `WEB_URL` | `web_url` |

## Day-to-day operations

### Initial deployment

1. Run `infra.yml` with `action=plan` to review.
2. Run `infra.yml` with `action=apply` and `image_tag=latest`.
3. The first apply will fail on the Container App creates because the ACR is empty — that's expected and documented in `infra/azure/README.md`. Continue with step 4.
4. Run `deploy.yml` (or it will auto-run on the next push to `api/**` or `web/**`).
5. Re-run `infra.yml` apply to finish reconciling everything (revision now exists with a real image).

### Subsequent deploys

- Push to `v2` touching `api/**` or `web/**` → `deploy.yml` builds, pushes, rolls.
- For infrastructure changes: edit `infra/azure/**`, push, then trigger `infra.yml` with `action=plan` (artifact attached for review), then `action=apply`.

### Rollback

```bash
# Locally
az containerapp revision list --name <api-app> --resource-group <rg> -o table
az containerapp revision activate --revision <previous-revision> --name <api-app> -g <rg>
```

Or re-run `deploy.yml` with an explicit `image_tag` input pointing at a prior tag.

### Destroy

Run `infra.yml` with `action=destroy` and `auto_approve=true`. There is an explicit guard against accidental destroys without `auto_approve`.

## Security notes

- All deploys use **OIDC federation** — no long-lived service principal passwords stored in GitHub.
- Container App secrets are pulled from Key Vault by **versionless reference** + UAMI; rotating a Key Vault secret only needs a revision restart, not a redeploy.
- The deploy principal needs subscription-scoped `Contributor` + `User Access Administrator`. If you need to tighten this, scope to the resource group and pre-create the role assignments — Terraform will then no-op those resources if `prevent_assignment_creation` is added (not currently configured).
- Pull requests do **not** run the deploy or infra workflows. Only the CI workflow runs on PRs, and it never authenticates to Azure.

## Troubleshooting

- **First `terraform apply` fails creating Container Apps with `ImagePullBackOff`** — expected on a fresh ACR. Re-run after `deploy.yml` has pushed at least one tag.
- **`AuthorizationFailed` during role assignment** — the deploy principal is missing `User Access Administrator`.
- **Federated credential token validation fails** — confirm `subject` matches the workflow's `${{ github.ref }}` (e.g. `repo:OWNER/REPO:ref:refs/heads/v2`) and the OIDC issuer is `https://token.actions.githubusercontent.com`.
- **`az containerapp update` succeeds but the revision is unhealthy** — check `az containerapp logs show --name <app> -g <rg> --follow` and the API's liveness probe path (`/health/status`).
