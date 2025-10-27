# GitHub Actions Multi-Cloud Deployment Guide

This guide explains how to set up and use the GitHub Actions workflow for multi-cloud deployment.

## 📋 Workflow Overview

### `multi-cloud-deploy.yml` - Multi-Cloud Deployment

**Manual workflow only** - triggered via GitHub UI or CLI with full cloud provider selection and Terraform integration.

**Note**: The previous `azure-deploy.yml` workflow has been removed. All deployments are now handled through the unified multi-cloud workflow.

## 🚀 Multi-Cloud Deployment Workflow

### Features
- ✅ **Cloud Provider Selection**: Deploy to Azure, AWS, GCP, or all at once
- ✅ **Environment Selection**: dev, staging, or prod
- ✅ **Terraform Actions**: plan, apply, or destroy
- ✅ **Parameterized**: All configurations driven by inputs and secrets
- ✅ **Docker Build Once**: Build images once, push to multiple registries
- ✅ **Parallel Deployment**: Deploy to multiple clouds simultaneously

## 🔐 Required GitHub Secrets

### Common Secrets (All Clouds)
```
OPENAI_API_KEY           # Your OpenAI API key
```

### Azure Secrets
```
AZURE_CREDENTIALS        # Service principal JSON
AZURE_CLIENT_ID          # Service principal client ID
AZURE_CLIENT_SECRET      # Service principal client secret
AZURE_SUBSCRIPTION_ID    # Azure subscription ID
AZURE_TENANT_ID          # Azure tenant ID
AZURE_ACR_NAME           # Azure Container Registry name (e.g., hoptranscribeacr)

# For legacy azure-deploy.yml
ACR_USERNAME             # ACR admin username
ACR_PASSWORD             # ACR admin password
```

### AWS Secrets
```
AWS_ACCESS_KEY_ID        # AWS access key
AWS_SECRET_ACCESS_KEY    # AWS secret access key
AWS_REGION               # AWS region (e.g., us-east-1)
```

### GCP Secrets
```
GCP_CREDENTIALS          # Service account JSON key
GCP_PROJECT_ID           # GCP project ID
GCP_REGION               # GCP region (e.g., us-central1)
```

## 📝 Setting Up GitHub Secrets

### Azure Setup

1. **Create Service Principal**:
```bash
# Login to Azure
az login

# Create service principal
az ad sp create-for-rbac \
  --name "hoptranscribe-github-actions" \
  --role "Contributor" \
  --scopes "/subscriptions/{subscription-id}" \
  --sdk-auth > azure-credentials.json

# Extract values
AZURE_CLIENT_ID=$(cat azure-credentials.json | jq -r '.clientId')
AZURE_CLIENT_SECRET=$(cat azure-credentials.json | jq -r '.clientSecret')
AZURE_SUBSCRIPTION_ID=$(cat azure-credentials.json | jq -r '.subscriptionId')
AZURE_TENANT_ID=$(cat azure-credentials.json | jq -r '.tenantId')
```

2. **Add GitHub Secrets**:
   - Go to: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`
   - Add each secret:
     - `AZURE_CREDENTIALS`: Entire JSON content from azure-credentials.json
     - `AZURE_CLIENT_ID`: Client ID value
     - `AZURE_CLIENT_SECRET`: Client secret value
     - `AZURE_SUBSCRIPTION_ID`: Subscription ID
     - `AZURE_TENANT_ID`: Tenant ID
     - `AZURE_ACR_NAME`: Your ACR name (e.g., "hoptranscribeacr")

3. **Create ACR** (if not exists):
```bash
az acr create \
  --resource-group hoptranscribe-rg \
  --name hoptranscribeacr \
  --sku Basic \
  --admin-enabled true
```

### AWS Setup

1. **Create IAM User**:
```bash
# Create IAM user
aws iam create-user --user-name hoptranscribe-github-actions

# Attach policies
aws iam attach-user-policy \
  --user-name hoptranscribe-github-actions \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess

aws iam attach-user-policy \
  --user-name hoptranscribe-github-actions \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess

# Create access key
aws iam create-access-key --user-name hoptranscribe-github-actions
```

2. **Add GitHub Secrets**:
   - `AWS_ACCESS_KEY_ID`: From access key creation output
   - `AWS_SECRET_ACCESS_KEY`: From access key creation output
   - `AWS_REGION`: Your preferred region (e.g., "us-east-1")

### GCP Setup

1. **Create Service Account**:
```bash
# Set variables
PROJECT_ID="your-gcp-project-id"
SA_NAME="hoptranscribe-github-actions"

# Create service account
gcloud iam service-accounts create $SA_NAME \
  --display-name "GitHub Actions for HOPTranscribe"

# Grant roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create key
gcloud iam service-accounts keys create gcp-key.json \
  --iam-account="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
```

2. **Add GitHub Secrets**:
   - `GCP_CREDENTIALS`: Entire JSON content from gcp-key.json
   - `GCP_PROJECT_ID`: Your GCP project ID
   - `GCP_REGION`: Your preferred region (e.g., "us-central1")

### Common Secrets

**Add OpenAI API Key**:
- `OPENAI_API_KEY`: Your OpenAI API key (starts with `sk-proj-...`)

## 🎯 Using the Multi-Cloud Workflow

### Option 1: GitHub UI (Recommended)

1. Go to your repository on GitHub
2. Click `Actions` tab
3. Select `Multi-Cloud Deployment` workflow
4. Click `Run workflow` dropdown
5. Select options:
   - **Cloud provider**: azure, aws, gcp, or all
   - **Environment**: dev, staging, or prod
   - **Terraform action**: plan, apply, or destroy
6. Click `Run workflow`

### Option 2: GitHub CLI

```bash
# Install GitHub CLI
brew install gh  # macOS
# or download from https://cli.github.com/

# Authenticate
gh auth login

# Run workflow - Plan only (safe)
gh workflow run multi-cloud-deploy.yml \
  -f cloud_provider=azure \
  -f environment=dev \
  -f terraform_action=plan

# Deploy to Azure dev
gh workflow run multi-cloud-deploy.yml \
  -f cloud_provider=azure \
  -f environment=dev \
  -f terraform_action=apply

# Deploy to all clouds (dev)
gh workflow run multi-cloud-deploy.yml \
  -f cloud_provider=all \
  -f environment=dev \
  -f terraform_action=apply

# Destroy AWS resources
gh workflow run multi-cloud-deploy.yml \
  -f cloud_provider=aws \
  -f environment=dev \
  -f terraform_action=destroy
```

## 📊 Workflow Stages

### 1. Build Images
- Builds Docker images for frontend and backend
- Caches layers for faster builds
- Creates artifacts for deployment jobs

### 2. Deploy to Cloud(s)
**For each selected cloud**:
- Downloads built images
- Logs in to cloud-specific registry
- Tags and pushes images
- Initializes Terraform
- Runs Terraform plan
- Applies infrastructure (if action=apply)
- Outputs deployment URLs

### 3. Deployment Summary
- Aggregates results from all deployments
- Shows environment and action performed
- Links to individual job outputs

## 🔍 Monitoring Deployments

### View Workflow Runs
```bash
# List recent runs
gh run list --workflow=multi-cloud-deploy.yml

# Watch specific run
gh run watch <run-id>

# View run logs
gh run view <run-id> --log
```

### Check Deployment Status

**Azure**:
```bash
az containerapp show \
  --name hoptranscribe-api \
  --resource-group hoptranscribe-dev-rg
```

**AWS**:
```bash
aws ecs describe-services \
  --cluster hoptranscribe-dev-cluster \
  --services hoptranscribe-dev-backend
```

**GCP**:
```bash
gcloud run services describe hoptranscribe-dev-backend \
  --region us-central1
```

## 🐛 Troubleshooting

### Authentication Errors

**Azure**:
```bash
# Verify service principal
az login --service-principal \
  -u $AZURE_CLIENT_ID \
  -p $AZURE_CLIENT_SECRET \
  --tenant $AZURE_TENANT_ID

# Test permissions
az account show
```

**AWS**:
```bash
# Verify credentials
aws sts get-caller-identity

# Test permissions
aws iam get-user
```

**GCP**:
```bash
# Verify service account
gcloud auth activate-service-account --key-file=gcp-key.json

# Test permissions
gcloud projects get-iam-policy $GCP_PROJECT_ID
```

### Terraform State Issues

If you see state lock errors:
1. Wait 5-10 minutes (lock may auto-expire)
2. Check no other workflow is running
3. Manually unlock if needed (see Terraform docs)

### Image Push Failures

**Check registry access**:
```bash
# Azure
az acr login --name hoptranscribeacr

# AWS
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com

# GCP
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### Workflow Fails on Specific Cloud

- Check cloud-specific secrets are set
- Verify cloud account has sufficient permissions
- Review Terraform configuration in `infra/<cloud>/`
- Check cloud service quotas/limits

## 📋 Workflow Best Practices

### 1. Always Plan First
```bash
# Run plan to preview changes
gh workflow run multi-cloud-deploy.yml \
  -f cloud_provider=azure \
  -f environment=dev \
  -f terraform_action=plan

# Review the plan in GitHub Actions UI
# Then apply if changes look good
gh workflow run multi-cloud-deploy.yml \
  -f cloud_provider=azure \
  -f environment=dev \
  -f terraform_action=apply
```

### 2. Use Environments Progressively
```bash
# Deploy to dev first
gh workflow run multi-cloud-deploy.yml \
  -f cloud_provider=azure \
  -f environment=dev \
  -f terraform_action=apply

# Test thoroughly, then staging
gh workflow run multi-cloud-deploy.yml \
  -f cloud_provider=azure \
  -f environment=staging \
  -f terraform_action=apply

# Finally production
gh workflow run multi-cloud-deploy.yml \
  -f cloud_provider=azure \
  -f environment=prod \
  -f terraform_action=apply
```

### 3. Cost Management
```bash
# Destroy dev environments when not in use
gh workflow run multi-cloud-deploy.yml \
  -f cloud_provider=all \
  -f environment=dev \
  -f terraform_action=destroy

# Keep staging/prod running with scale-to-zero (Azure/GCP)
```

### 4. Multi-Cloud Strategy

**Testing**: Deploy to all clouds in dev
```bash
gh workflow run multi-cloud-deploy.yml \
  -f cloud_provider=all \
  -f environment=dev \
  -f terraform_action=apply
```

**Production**: Choose best cloud based on testing
```bash
# Deploy to GCP for lowest cost
gh workflow run multi-cloud-deploy.yml \
  -f cloud_provider=gcp \
  -f environment=prod \
  -f terraform_action=apply

# Or Azure for balance
gh workflow run multi-cloud-deploy.yml \
  -f cloud_provider=azure \
  -f environment=prod \
  -f terraform_action=apply
```

## 🔄 Updating Infrastructure

### Change Terraform Configuration

1. Edit `infra/<cloud>/terraform.tfvars.example`
2. Update `infra/<cloud>/variables.tf` if needed
3. Commit and push changes
4. Run workflow with `plan` first to review
5. Apply changes

### Update Docker Images Only

If you only need to update application code (not infrastructure):

Use the existing `azure-deploy.yml` workflow (auto-triggers on push to main) or manually push images:

```bash
# Build and push manually
docker build -t <registry>/hoptranscribe-backend:latest src/be/
docker push <registry>/hoptranscribe-backend:latest

# Force new deployment
az containerapp update --name hoptranscribe-api --resource-group ... --image ...
```

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Terraform with GitHub Actions](https://learn.hashicorp.com/tutorials/terraform/github-actions)
- [Azure Service Principal Setup](https://learn.microsoft.com/azure/developer/github/connect-from-azure)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [GCP Service Account Keys](https://cloud.google.com/iam/docs/creating-managing-service-account-keys)

## 🤝 Contributing

When updating workflows:
1. Test in a fork first
2. Use workflow_dispatch for manual testing
3. Document all new secrets required
4. Update this guide with changes
5. Consider backward compatibility
