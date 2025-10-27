# HOPTranscribe - Azure Deployment Guide

This guide walks you through deploying HOPTranscribe to Azure using GitHub Actions CI/CD.

## 📋 Prerequisites

1. **Azure Account** with active subscription
2. **GitHub Account** with repository access
3. **OpenAI API Key** with Realtime API access
4. **Azure CLI** installed locally (for setup)

## 🚀 Deployment Options

### Option 1: Azure Container Instances (ACI)
- **Best for**: Development, testing, simple deployments
- **Pros**: Simple, fast deployment, pay-per-second billing
- **Cons**: No auto-scaling, limited networking features
- **Cost**: ~$30-50/month

### Option 2: Azure Container Apps (ACA)
- **Best for**: Production, auto-scaling requirements
- **Pros**: Auto-scaling, better networking, managed ingress
- **Cons**: Slightly more complex, higher base cost
- **Cost**: ~$50-100/month

## 🔧 Setup Instructions

### Step 1: Create Azure Resources

```bash
# Login to Azure
az login

# Set variables
RESOURCE_GROUP="hoptranscribe-rg"
LOCATION="eastus"
ACR_NAME="hoptranscribeacr"  # Must be globally unique

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Azure Container Registry
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true

# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query "username" -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

echo "ACR Username: $ACR_USERNAME"
echo "ACR Password: $ACR_PASSWORD"
```

### Step 2: Create Service Principal for GitHub Actions

```bash
# Get subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Create service principal
az ad sp create-for-rbac \
  --name "hoptranscribe-github-actions" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth

# This will output JSON - copy the entire output for GitHub secrets
```

### Step 3: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `AZURE_CREDENTIALS` | JSON from Step 2 | Service principal credentials |
| `ACR_USERNAME` | From Step 1 | Container registry username |
| `ACR_PASSWORD` | From Step 1 | Container registry password |
| `OPENAI_API_KEY` | Your OpenAI key | OpenAI API key for backend |

**Example AZURE_CREDENTIALS format:**
```json
{
  "clientId": "xxx-xxx-xxx",
  "clientSecret": "xxx-xxx-xxx",
  "subscriptionId": "xxx-xxx-xxx",
  "tenantId": "xxx-xxx-xxx"
}
```

### Step 4: Update Workflow Configuration (Optional)

Edit `.github/workflows/azure-deploy.yml`:

```yaml
env:
  AZURE_RESOURCE_GROUP: hoptranscribe-rg  # Your resource group
  AZURE_LOCATION: eastus                   # Your location
  ACR_NAME: hoptranscribeacr              # Your ACR name
```

**To use Azure Container Apps instead of ACI:**
```yaml
deploy-to-aca:
  if: github.ref == 'refs/heads/main' && true  # Change false to true
```

### Step 5: Deploy

#### Automatic Deployment (via GitHub Actions)

```bash
# Push to main branch
git add .
git commit -m "Deploy to Azure"
git push origin main

# GitHub Actions will automatically:
# 1. Build Docker images
# 2. Push to Azure Container Registry
# 3. Deploy to Azure Container Instances/Apps
```

#### Manual Deployment (via GitHub UI)

1. Go to **Actions** tab in GitHub
2. Select **Build and Deploy to Azure**
3. Click **Run workflow**
4. Select branch and click **Run workflow**

### Step 6: Access Your Application

#### For Azure Container Instances:
```bash
# Get frontend URL
FRONTEND_URL=$(az container show \
  --resource-group hoptranscribe-rg \
  --name hoptranscribe-web \
  --query "ipAddress.fqdn" -o tsv)

echo "Frontend: http://${FRONTEND_URL}"

# Get backend URL
BACKEND_URL=$(az container show \
  --resource-group hoptranscribe-rg \
  --name hoptranscribe-api \
  --query "ipAddress.fqdn" -o tsv)

echo "Backend: http://${BACKEND_URL}:8080"
```

#### For Azure Container Apps:
```bash
# Get frontend URL
FRONTEND_URL=$(az containerapp show \
  --resource-group hoptranscribe-rg \
  --name hoptranscribe-web \
  --query "properties.configuration.ingress.fqdn" -o tsv)

echo "Frontend: https://${FRONTEND_URL}"

# Get backend URL
BACKEND_URL=$(az containerapp show \
  --resource-group hoptranscribe-rg \
  --name hoptranscribe-api \
  --query "properties.configuration.ingress.fqdn" -o tsv)

echo "Backend: https://${BACKEND_URL}"
```

## 🔍 Monitoring & Troubleshooting

### View Logs

#### ACI Logs:
```bash
# Backend logs
az container logs \
  --resource-group hoptranscribe-rg \
  --name hoptranscribe-api \
  --follow

# Frontend logs
az container logs \
  --resource-group hoptranscribe-rg \
  --name hoptranscribe-web \
  --follow
```

#### ACA Logs:
```bash
# Backend logs
az containerapp logs show \
  --resource-group hoptranscribe-rg \
  --name hoptranscribe-api \
  --follow

# Frontend logs
az containerapp logs show \
  --resource-group hoptranscribe-rg \
  --name hoptranscribe-web \
  --follow
```

### Check Container Status

```bash
# ACI
az container show \
  --resource-group hoptranscribe-rg \
  --name hoptranscribe-api \
  --query "instanceView.state" -o tsv

# ACA
az containerapp show \
  --resource-group hoptranscribe-rg \
  --name hoptranscribe-api \
  --query "properties.runningStatus" -o tsv
```

### Common Issues

**1. Image Pull Failed**
```bash
# Verify ACR credentials
az acr credential show --name hoptranscribeacr

# Update GitHub secrets with correct credentials
```

**2. Backend Returns 401/403**
```bash
# Verify OpenAI API key is set correctly
az container show \
  --resource-group hoptranscribe-rg \
  --name hoptranscribe-api \
  --query "containers[0].environmentVariables"
```

**3. CORS Errors**
```bash
# Update backend AllowedOrigins to include frontend URL
# Redeploy with updated environment variables
```

## 📊 Cost Optimization

### ACI Cost Reduction
```bash
# Stop containers when not in use
az container stop \
  --resource-group hoptranscribe-rg \
  --name hoptranscribe-api

# Start when needed
az container start \
  --resource-group hoptranscribe-rg \
  --name hoptranscribe-api
```

### ACA Cost Reduction
```yaml
# In azure-deploy.yml, adjust min/max replicas
--min-replicas 0  # Scale to zero when idle
--max-replicas 2  # Limit max instances
```

## 🧹 Cleanup

### Delete All Resources
```bash
# Delete entire resource group
az group delete \
  --name hoptranscribe-rg \
  --yes --no-wait

# Delete service principal
az ad sp delete --id $(az ad sp list --display-name "hoptranscribe-github-actions" --query "[0].id" -o tsv)
```

## 🔄 CI/CD Pipeline Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Push to main                      │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Build & Push Docker Images Job                  │
│  1. Build backend image                                      │
│  2. Build frontend image                                     │
│  3. Push to Azure Container Registry                         │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                 Deploy to Azure Job                          │
│  1. Login to Azure                                           │
│  2. Deploy backend container (ACI/ACA)                       │
│  3. Deploy frontend container (ACI/ACA)                      │
│  4. Configure networking & environment                       │
└─────────────────────────────────────────────────────────────┘
```

## 📝 Environment Variables Reference

### Backend Container
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ASPNETCORE_ENVIRONMENT` | Yes | Production | ASP.NET environment |
| `OpenAI__ApiKey` | Yes | - | OpenAI API key |
| `OpenAI__TimeoutSeconds` | No | 30 | API timeout |
| `OpenAI__Voice` | No | alloy | TTS voice |
| `AllowedOrigins__0` | Yes | - | Frontend URL for CORS |

### Frontend Container
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | - | Backend API URL |

## 🔐 Security Best Practices

1. **Never commit secrets** - Use GitHub secrets
2. **Rotate credentials** - Change ACR passwords regularly
3. **Use managed identities** - For production, use Azure Managed Identity instead of service principal
4. **Enable HTTPS** - Use Azure Front Door or Application Gateway for SSL
5. **Network isolation** - Use Azure Virtual Network for container-to-container communication

## 📚 Additional Resources

- [Azure Container Instances Docs](https://learn.microsoft.com/azure/container-instances/)
- [Azure Container Apps Docs](https://learn.microsoft.com/azure/container-apps/)
- [GitHub Actions for Azure](https://github.com/Azure/actions)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
