# Azure Infrastructure - Terraform

This directory contains Terraform configurations for deploying HOPTranscribe to Azure Container Apps.

## 📁 Files

- `main.tf` - Main infrastructure resources
- `variables.tf` - Input variables and validation
- `outputs.tf` - Output values after deployment
- `terraform.tfvars.example` - Example configuration file

## 🚀 Quick Start

### Prerequisites

1. **Azure CLI** installed and authenticated
2. **Terraform** >= 1.0 installed
3. **OpenAI API Key**

### 1. Configure Variables

```bash
# Copy example config
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values
nano terraform.tfvars
```

### 2. Set OpenAI API Key (Secure Method)

**Option A: Environment Variable (Recommended)**
```bash
export TF_VAR_openai_api_key="sk-proj-your-key-here"
```

**Option B: Pass via CLI**
```bash
terraform apply -var="openai_api_key=sk-proj-your-key-here"
```

### 3. Initialize Terraform

```bash
terraform init
```

### 4. Plan Deployment

```bash
terraform plan
```

### 5. Apply Configuration

```bash
terraform apply
```

Review the plan and type `yes` to confirm.

### 6. Get Outputs

```bash
terraform output

# Specific output
terraform output frontend_url
terraform output backend_url
```

## 📊 Resource Overview

This Terraform configuration creates:

- ✅ Resource Group
- ✅ Azure Container Registry (ACR)
- ✅ Log Analytics Workspace
- ✅ Container Apps Environment
- ✅ Backend Container App (API)
- ✅ Frontend Container App (Web UI)

## ⚙️ Configuration Options

### Environment Types

**Development (dev)**:
```hcl
environment          = "dev"
backend_min_replicas = 0  # Scale to zero
backend_max_replicas = 2
acr_sku             = "Basic"
```

**Staging (staging)**:
```hcl
environment          = "staging"
backend_min_replicas = 1
backend_max_replicas = 3
acr_sku             = "Standard"
```

**Production (prod)**:
```hcl
environment          = "prod"
backend_min_replicas = 2  # Always available
backend_max_replicas = 5
acr_sku             = "Premium"
```

### Scaling Configuration

**Backend**:
- `backend_min_replicas`: 0-30 (0 enables scale-to-zero)
- `backend_max_replicas`: 1-30
- `backend_cpu`: 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0
- `backend_memory`: "0.5Gi", "1Gi", "2Gi", "4Gi"

**Frontend**:
- `frontend_min_replicas`: 0-30
- `frontend_max_replicas`: 1-30
- `frontend_cpu`: 0.25 - 2.0
- `frontend_memory`: "0.5Gi", "1Gi", "2Gi"

### Cost Optimization

**Development (Low Cost)**:
```hcl
backend_min_replicas = 0
backend_cpu         = 0.5
backend_memory      = "1Gi"
frontend_min_replicas = 0
frontend_cpu        = 0.25
frontend_memory     = "0.5Gi"
```
**Est. Cost**: ~$15-25/month

**Production (High Availability)**:
```hcl
backend_min_replicas = 2
backend_cpu         = 1.0
backend_memory      = "2Gi"
frontend_min_replicas = 2
frontend_cpu        = 0.5
frontend_memory     = "1Gi"
```
**Est. Cost**: ~$50-80/month

## 🔐 Security Best Practices

### 1. Never Commit Secrets

```bash
# Add to .gitignore
echo "terraform.tfvars" >> .gitignore
echo "*.tfvars" >> .gitignore
echo ".terraform/" >> .gitignore
```

### 2. Use Environment Variables

```bash
export TF_VAR_openai_api_key="your-key"
export ARM_CLIENT_ID="..."
export ARM_CLIENT_SECRET="..."
export ARM_SUBSCRIPTION_ID="..."
export ARM_TENANT_ID="..."
```

### 3. Use Remote State (Production)

```hcl
# In main.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate"
    container_name       = "tfstate"
    key                  = "hoptranscribe.tfstate"
  }
}
```

## 📦 Common Commands

```bash
# Initialize
terraform init

# Validate configuration
terraform validate

# Plan changes
terraform plan

# Apply changes
terraform apply

# Show current state
terraform show

# List resources
terraform state list

# Get specific output
terraform output backend_url

# Destroy all resources
terraform destroy

# Format code
terraform fmt

# Import existing resource
terraform import azurerm_resource_group.main /subscriptions/.../resourceGroups/...
```

## 🔄 Updating Infrastructure

### Update Container Images

Images are pulled from ACR with `:latest` tag. To update:

1. Build and push new images to ACR
2. Run `terraform apply` to trigger update
3. Container Apps will perform rolling update

### Change Configuration

```bash
# Edit terraform.tfvars
nano terraform.tfvars

# Preview changes
terraform plan

# Apply changes
terraform apply
```

## 🧹 Cleanup

### Destroy All Resources

```bash
terraform destroy
```

⚠️ **Warning**: This will delete all resources including data!

### Destroy Specific Resources

```bash
terraform destroy -target=azurerm_container_app.frontend
```

## 🐛 Troubleshooting

### Authentication Issues

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "Your Subscription Name"

# Verify
az account show
```

### State Lock Issues

```bash
# Force unlock (if lock is stale)
terraform force-unlock <LOCK_ID>
```

### Resource Already Exists

```bash
# Import existing resource
terraform import azurerm_resource_group.main /subscriptions/{sub-id}/resourceGroups/{rg-name}
```

### Plan Shows Unwanted Changes

```bash
# Refresh state
terraform refresh

# Check drift
terraform plan -refresh-only
```

## 📚 Additional Resources

- [Azure Container Apps Terraform Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app)
- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Azure Container Apps Pricing](https://azure.microsoft.com/pricing/details/container-apps/)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)
