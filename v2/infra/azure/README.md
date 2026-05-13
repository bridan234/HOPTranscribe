# HOPTranscribe v2 — Azure Terraform

Production Azure deploy for the v2 split-stage transcription stack. Single
Terraform root that provisions:

- Resource group
- Azure Container Registry (Basic, AcrPull via UAMI — no admin user)
- User-assigned Managed Identity (UAMI) shared by both Container Apps for
  ACR pull and Key Vault Secrets User
- Key Vault (RBAC-authorized) with `openai-api-key` and `jwt-signing-key`
- Storage Account + Azure Files share (`sqlite`, 5 GiB) for the API's
  SQLite database, mounted at `/data` in the API container
- Log Analytics workspace + workspace-based Application Insights
- Azure Container Apps environment (consumption profile)
- API Container App (port 8080) with health probes and persistent volume
- Web Container App (nginx on port 80) consuming the API FQDN at build time

```
                                  ┌────────────────────────────────┐
                                  │  Container Apps environment     │
                                  │                                 │
  Browser ── HTTPS ──► ca-web ───►│  ca-api ── /data ── Azure Files │
                       (nginx)    │                                 │
                                  │  └─► OpenAI (key from KV)       │
                                  └────────────────────────────────┘
                                          │                │
                                  Log Analytics       Key Vault
                                  + App Insights      (UAMI: Secrets User)
```

## Prerequisites

- Terraform ≥ 1.5
- Azure CLI logged in: `az login` then `az account set -s <subscription>`
- The deploying principal needs `Owner` (or `Contributor` + `User Access
  Administrator`) on the target subscription so it can create RBAC role
  assignments (ACR pull, Key Vault Secrets User, Secrets Officer for self).
- Docker (for building the images)

## 1. Provision infra

```bash
cd v2/infra/azure
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars and set at minimum: openai_api_key
terraform init
terraform plan -out plan.tfplan
terraform apply plan.tfplan
```

On the very first apply, Container Apps will try to pull `hoptranscribe-api:latest`
and `hoptranscribe-web:latest` from the empty registry and the deployment
will fail because the images don't exist yet. You have two options:

### Option A — build & push first, apply second (recommended)

1. `terraform apply -target=azurerm_container_registry.this` to create the
   registry only.
2. Build and push images (see below).
3. `terraform apply` to deploy everything.

### Option B — let the first apply fail, then push and apply again

1. `terraform apply` (Container App creation fails — that's fine, ACR is up).
2. Build and push images.
3. `terraform apply` again — Container Apps will roll healthy.

## 2. Build and push images

```bash
ACR=$(terraform output -raw acr_name)
TAG=$(terraform output -raw api_image_reference | awk -F: '{print $NF}')

az acr login --name "$ACR"

# API
docker build --platform linux/amd64 -t "$ACR.azurecr.io/hoptranscribe-api:$TAG" ../../api
docker push "$ACR.azurecr.io/hoptranscribe-api:$TAG"

# Web — pass the API URL at build time so the bundle hard-codes it
API_URL=$(terraform output -raw api_url)
docker build --platform linux/amd64 \
  --build-arg VITE_API_BASE_URL="$API_URL" \
  -t "$ACR.azurecr.io/hoptranscribe-web:$TAG" ../../web
docker push "$ACR.azurecr.io/hoptranscribe-web:$TAG"
```

> The `Dockerfile`s for both services already exist under `v2/api/` and
> `v2/web/`. The web `Dockerfile` accepts a `VITE_API_BASE_URL` build arg
> so the bundle is locked to the API origin.

## 3. Roll a new revision

Because we set `ignore_changes = [template[0].container[0].image]`, you can
push a new tag and roll without a `terraform apply`:

```bash
NEW_TAG=$(git rev-parse --short HEAD)
docker build --platform linux/amd64 -t "$ACR.azurecr.io/hoptranscribe-api:$NEW_TAG" ../../api
docker push "$ACR.azurecr.io/hoptranscribe-api:$NEW_TAG"

az containerapp update \
  --name $(terraform output -raw api_image_reference | awk -F/ '{print $NF}' | awk -F: '{print $1}') \
  --resource-group $(terraform output -raw resource_group_name) \
  --image "$ACR.azurecr.io/hoptranscribe-api:$NEW_TAG"
```

To re-pin the tag in Terraform (so a future `apply` won't drift), update
`image_tag` in `terraform.tfvars` to `$NEW_TAG`.

## 4. CORS / custom domains

`allowed_origins` is a comma-separated list passed straight into the API's
`Cors:AllowedOrigins` setting. After the first apply you can read the web
FQDN and add it (or your custom domain) to that list:

```bash
WEB_URL=$(terraform output -raw web_url)
terraform apply -var "allowed_origins=$WEB_URL,https://app.example.com"
```

## 5. Secrets

- `openai_api_key` and `jwt_signing_key` live in Key Vault and are mounted
  into the API as Container App secrets via the UAMI (no key data passes
  through Container Apps configuration in plain text).
- Rotating: update the Key Vault secret version, then either bounce the
  revision (`az containerapp revision restart`) or push a new image tag.
  Because the secret reference is versionless, Container Apps re-resolves
  it on each replica start.

## 6. Cost notes (rough, eastus, monthly)

- Container Apps: ~$0/idle (consumption, scales to 0 if `min_replicas=0`),
  ~$15–30 at `min_replicas=1` for the two apps combined.
- ACR Basic: $5
- Log Analytics: $2–10 depending on volume
- App Insights: included in LA workspace pricing
- Storage (Azure Files SMB, 5 GiB hot, LRS): <$1
- Key Vault: ~$0.03 per 10K ops
- **Total floor:** ~$25/mo at low traffic, OpenAI costs dominate.

## 7. Destroying

```bash
terraform destroy
```

Key Vault has `purge_soft_delete_on_destroy = true` (see `versions.tf`), so
secret names are reusable on the next apply. The Storage account file share
is deleted with the account — back it up first if you care about session
history.
