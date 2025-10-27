# HOPTranscribe - Azure Deployment Guide

This guide walks you through deploying HOPTranscribe to Azure Container Apps (ACA) using GitHub Actions CI/CD.

## 📋 Prerequisites

1. **Azure Account** with active subscription
2. **GitHub Account** with repository access
3. **OpenAI API Key** with Realtime API access
4. **Azure CLI** installed locally (for setup)

## 🚀 Architecture

**Azure Container Apps (ACA)** - Production-ready deployment with:
- ✅ Auto-scaling (1-5 replicas)
- ✅ Managed ingress with HTTPS
- ✅ Built-in load balancing
- ✅ Rolling updates with zero downtime
- ✅ Cost optimization with scale-to-zero (optional)

**Estimated Cost**: ~$40-60/month with auto-scaling

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
# 3. Deploy to Azure Container Apps
```

#### Manual Deployment (via GitHub UI)

1. Go to **Actions** tab in GitHub
2. Select **Build and Deploy to Azure**
3. Click **Run workflow**
4. Select branch and click **Run workflow**

### Step 6: Access Your Application

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
echo "Health Check: https://${BACKEND_URL}/health/status"
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

### Check Container Status

```bash
# Check app status
az containerapp show \
  --resource-group hoptranscribe-rg \
  --name hoptranscribe-api \
  --query "properties.runningStatus" -o tsv

# Check replica count
az containerapp replica list \
  --resource-group hoptranscribe-rg \
  --name hoptranscribe-api
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
az containerapp show \
  --resource-group hoptranscribe-rg \
  --name hoptranscribe-api \
  --query "properties.template.containers[0].env"
```

**3. CORS Errors**
```bash
# The backend automatically allows the frontend URL
# If issues persist, check the backend logs for CORS errors
az containerapp logs show \
  --resource-group hoptranscribe-rg \
  --name hoptranscribe-api \
  --follow
```

## 📊 Cost Optimization

### ACI Cost Reduction
## 📊 Cost Optimization

### Enable Scale-to-Zero (Development)
```bash
# Update backend to scale to zero when idle
az containerapp update \
  --name hoptranscribe-api \
  --resource-group hoptranscribe-rg \
  --min-replicas 0 \
  --max-replicas 2

# Note: First request after scale-to-zero will have ~10s cold start
```

### Reduce Resources (Lower Cost)
```bash
# Backend - reduce CPU/memory
az containerapp update \
  --name hoptranscribe-api \
  --resource-group hoptranscribe-rg \
  --cpu 0.5 \
  --memory 1.0Gi

# Frontend - reduce CPU/memory
az containerapp update \
  --name hoptranscribe-web \
  --resource-group hoptranscribe-rg \
  --cpu 0.25 \
  --memory 0.5Gi
```

**Estimated Monthly Costs:**
- **Production** (1-3 backend, 1-5 frontend replicas): ~$40-60
- **Development** (scale-to-zero enabled): ~$15-25
- **ACR Basic**: ~$5
- **Total**: ~$20-65/month depending on usage

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
│            Deploy to Azure Container Apps Job                │
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
