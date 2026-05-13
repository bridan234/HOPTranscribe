# Multi-Cloud Infrastructure Summary

This document provides a comprehensive overview of the HOPTranscribe multi-cloud infrastructure setup.

## 📋 Infrastructure Overview

The HOPTranscribe application can now be deployed to **three major cloud providers** using Infrastructure as Code (Terraform):

1. **Azure** - Azure Container Apps (ACA)
2. **AWS** - Elastic Container Service (ECS) with Fargate
3. **GCP** - Cloud Run

## 🏗️ Architecture Patterns

All three cloud deployments follow the same architectural pattern:

```
┌─────────────────┐
│   Load Balancer │  ← Public internet traffic
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│Frontend│ │Backend│
│Container│ │Container│
│  (Web) │ │  (API)│
└────────┘ └───┬───┘
               │
         ┌─────▼──────┐
         │  Secrets   │  ← OpenAI API Key
         │  Manager   │
         └────────────┘
```

### Components

Each cloud deployment includes:

- **Container Registry** (ACR / ECR / Artifact Registry)
- **Compute Service** (Container Apps / ECS Fargate / Cloud Run)
- **Secret Management** (Azure Key Vault / AWS Secrets Manager / GCP Secret Manager)
- **Networking** (Managed Ingress / VPC+ALB / Managed)
- **Logging** (Log Analytics / CloudWatch / Cloud Logging)
- **Auto-scaling** (Built-in for all providers)

## 🎯 Cloud Provider Selection Guide

### Choose Azure Container Apps if:
- ✅ You want balanced cost and features
- ✅ You need scale-to-zero capability
- ✅ You prefer Microsoft ecosystem
- ✅ You want simple networking
- ✅ Budget: $15-80/month

### Choose AWS ECS Fargate if:
- ✅ You need enterprise-grade features
- ✅ You have complex networking requirements (VPC)
- ✅ You're already on AWS
- ✅ You need 24/7 availability (no scale-to-zero)
- ✅ Budget: $55-155/month

### Choose GCP Cloud Run if:
- ✅ You want the lowest development cost
- ✅ You need fast scale-to-zero
- ✅ You prefer serverless simplicity
- ✅ You're starting a new project
- ✅ Budget: $6-105/month

## 📊 Detailed Comparison

| Feature | Azure | AWS | GCP |
|---------|-------|-----|-----|
| **Container Service** | Container Apps | ECS Fargate | Cloud Run |
| **Registry** | Azure Container Registry | Elastic Container Registry | Artifact Registry |
| **Secrets** | Key Vault | Secrets Manager | Secret Manager |
| **Networking** | Managed Ingress | VPC + ALB + Security Groups | Managed |
| **Logging** | Log Analytics | CloudWatch | Cloud Logging |
| **Scale-to-Zero** | Yes (0 replicas) | No (min 1 task) | Yes (0 instances) |
| **Cold Start Time** | 1-2 seconds | N/A (always on) | 1-2 seconds |
| **Min Replicas** | 0-30 | 1+ | 0-100 |
| **Max Replicas** | 1-30 | 1-1000 | 1-1000 |
| **CPU Options** | 0.25-4 vCPU | 0.25-4 vCPU | 1-8 vCPU |
| **Memory Options** | 0.5Gi-8Gi | 0.5GB-30GB | 128Mi-32Gi |
| **Health Checks** | HTTP/TCP | HTTP/TCP | HTTP |
| **Auto-scaling** | CPU/Memory/HTTP | CPU/Memory | CPU/Memory/Requests |
| **Custom Domains** | Yes (managed certs) | Yes (ALB + ACM) | Yes (Cloud Load Balancer) |
| **Deployment Speed** | ~3-5 min | ~5-10 min | ~2-4 min |

## 💰 Cost Breakdown

### Development Environment

| Cloud | Monthly Cost | Components |
|-------|-------------|------------|
| **GCP** | **$6-12** | • Cloud Run (scale-to-zero)<br>• Artifact Registry<br>• Secret Manager |
| **Azure** | **$15-25** | • Container Apps (scale-to-zero)<br>• ACR (Basic)<br>• Log Analytics |
| **AWS** | **$55-65** | • ECS Fargate (always on)<br>• ALB<br>• ECR<br>• CloudWatch Logs |

### Production Environment

| Cloud | Monthly Cost | Components |
|-------|-------------|------------|
| **Azure** | **$50-80** | • Container Apps (2 BE, 2 FE)<br>• ACR (Basic/Standard)<br>• Log Analytics |
| **GCP** | **$65-105** | • Cloud Run (2 BE, 2 FE)<br>• Artifact Registry<br>• Secret Manager |
| **AWS** | **$130-155** | • ECS Fargate (2 BE, 2 FE)<br>• ALB<br>• ECR<br>• CloudWatch<br>• Secrets Manager |

## 🔧 Terraform Configuration

### Directory Structure

```
infra/
├── azure/
│   ├── main.tf                      # Azure resources
│   ├── variables.tf                 # Input variables
│   ├── outputs.tf                   # Deployment outputs
│   ├── terraform.tfvars.example     # Example config
│   └── README.md                    # Azure guide
│
├── aws/
│   ├── main.tf                      # AWS resources (VPC, ECS, ALB)
│   ├── variables.tf                 # Input variables
│   ├── outputs.tf                   # Deployment outputs
│   ├── terraform.tfvars.example     # Example config
│   └── README.md                    # AWS guide
│
├── gcp/
│   ├── main.tf                      # GCP resources
│   ├── variables.tf                 # Input variables
│   ├── outputs.tf                   # Deployment outputs
│   ├── terraform.tfvars.example     # Example config
│   └── README.md                    # GCP guide
│
└── README.md                        # Multi-cloud overview
```

### Key Parameters

All configurations share these key parameters:

```hcl
# Project Configuration
project_name = "hoptranscribe"
environment  = "dev"  # dev, staging, prod

# Backend Scaling
backend_min_instances = 0     # 0 for scale-to-zero (Azure/GCP only)
backend_max_instances = 3
backend_cpu          = "1"
backend_memory       = "2Gi"

# Frontend Scaling
frontend_min_instances = 0
frontend_max_instances = 5
frontend_cpu          = "1"
frontend_memory       = "512Mi"

# Secrets
openai_api_key = "sk-proj-..."  # Set via TF_VAR_openai_api_key
openai_voice   = "alloy"
```

## 🚀 Deployment Workflows

### Option 1: Single Cloud Deployment

Deploy to one cloud provider:

```bash
# Choose your cloud
cd infra/azure  # or aws, or gcp

# Configure
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars

# Set secrets
export TF_VAR_openai_api_key="your-key"

# Deploy
terraform init
terraform plan
terraform apply

# Get URLs
terraform output frontend_url
terraform output backend_url
```

### Option 2: Multi-Cloud Deployment

Deploy to multiple clouds for redundancy:

```bash
# Deploy to all clouds
for cloud in azure aws gcp; do
  cd infra/$cloud
  cp terraform.tfvars.example terraform.tfvars
  # Edit terraform.tfvars
  export TF_VAR_openai_api_key="your-key"
  terraform init
  terraform apply -auto-approve
  cd ../..
done
```

### Option 3: CI/CD with GitHub Actions

The GitHub Actions workflow can be extended to support multi-cloud deployment:

```yaml
# .github/workflows/multi-cloud-deploy.yml
name: Multi-Cloud Deploy

on:
  workflow_dispatch:
    inputs:
      cloud:
        description: 'Cloud provider to deploy to'
        required: true
        type: choice
        options:
          - azure
          - aws
          - gcp
          - all

jobs:
  deploy-azure:
    if: github.event.inputs.cloud == 'azure' || github.event.inputs.cloud == 'all'
    # Azure deployment steps
    
  deploy-aws:
    if: github.event.inputs.cloud == 'aws' || github.event.inputs.cloud == 'all'
    # AWS deployment steps
    
  deploy-gcp:
    if: github.event.inputs.cloud == 'gcp' || github.event.inputs.cloud == 'all'
    # GCP deployment steps
```

## 📈 Scaling Configuration

### Development (Cost-Optimized)

```hcl
# Scale-to-zero when idle
backend_min_instances  = 0
backend_max_instances  = 2
backend_cpu           = "0.5"
backend_memory        = "1Gi"

frontend_min_instances = 0
frontend_max_instances = 3
frontend_cpu          = "0.5"
frontend_memory       = "512Mi"
```

### Staging (Balanced)

```hcl
# Minimal warm instances
backend_min_instances  = 1
backend_max_instances  = 3
backend_cpu           = "1"
backend_memory        = "2Gi"

frontend_min_instances = 1
frontend_max_instances = 5
frontend_cpu          = "1"
frontend_memory       = "1Gi"
```

### Production (High Availability)

```hcl
# Multiple instances for redundancy
backend_min_instances  = 2
backend_max_instances  = 6
backend_cpu           = "2"
backend_memory        = "4Gi"

frontend_min_instances = 2
frontend_max_instances = 10
frontend_cpu          = "1"
frontend_memory       = "1Gi"
```

## 🔐 Security Implementation

### Secret Management

All three clouds use native secret management:

**Azure**:
```hcl
# secretref in Container App
--set-env-vars OpenAI__ApiKey=secretref:openai-key
```

**AWS**:
```hcl
# Secrets Manager + ECS secrets
secrets = [{
  name      = "OpenAI__ApiKey"
  valueFrom = aws_secretsmanager_secret.openai_key.arn
}]
```

**GCP**:
```hcl
# Secret Manager with version
env {
  name = "OpenAI__ApiKey"
  value_source {
    secret_key_ref {
      secret  = google_secret_manager_secret.openai_key.secret_id
      version = "latest"
    }
  }
}
```

### IAM/RBAC Configuration

Each cloud uses principle of least privilege:

- **Azure**: Service principals with specific role assignments
- **AWS**: IAM roles with inline policies for secret access
- **GCP**: Service accounts with granular IAM bindings

## 📊 Monitoring & Observability

### Logging

**Azure**:
```bash
az containerapp logs show \
  --name hoptranscribe-dev-backend \
  --resource-group hoptranscribe-dev-rg \
  --tail 100
```

**AWS**:
```bash
aws logs tail /ecs/hoptranscribe-dev/backend --follow
```

**GCP**:
```bash
gcloud run services logs read hoptranscribe-dev-backend \
  --region=us-central1 \
  --tail
```

### Health Checks

All deployments include health probes:

- **Startup Probe**: Ensures container is ready to serve traffic
- **Liveness Probe**: Detects if container needs restart
- **Readiness Probe**: Controls load balancer traffic routing

## 🔄 Update Strategies

### Container Image Updates

Each cloud handles updates differently:

**Azure**: Rolling update with revision management
```bash
az containerapp update --name hoptranscribe-dev-backend \
  --image <new-image>
```

**AWS**: Rolling update with task definition versions
```bash
aws ecs update-service --service hoptranscribe-dev-backend \
  --force-new-deployment
```

**GCP**: Gradual rollout with automatic traffic shifting
```bash
gcloud run services update hoptranscribe-dev-backend \
  --image <new-image>
```

## 🧪 Testing Checklist

After deployment to any cloud:

- [ ] Frontend accessible via browser
- [ ] Backend health check responds (200 OK)
- [ ] OpenAI integration works (secrets configured)
- [ ] Auto-scaling triggers on load
- [ ] Logs are accessible
- [ ] Monitoring dashboards show metrics
- [ ] HTTPS/TLS configured correctly
- [ ] CORS configured for frontend-backend communication

## 🐛 Common Issues

### Authentication Failures

**Azure**: Run `az login`  
**AWS**: Check AWS CLI credentials with `aws sts get-caller-identity`  
**GCP**: Run `gcloud auth application-default login`

### Cold Start Delays

- Set `min_instances = 1` to keep warm instances
- Optimize container image size
- Use multi-stage Docker builds (already implemented)

### High Costs

- Enable scale-to-zero for dev environments
- Right-size CPU and memory allocations
- Set appropriate max replica/instance limits
- Review and delete unused resources

## 📚 Next Steps

1. **Choose your cloud provider** based on requirements and budget
2. **Deploy to dev environment** first
3. **Test thoroughly** before promoting to production
4. **Set up CI/CD** for automated deployments
5. **Configure monitoring** and alerting
6. **Implement backup strategy** if needed
7. **Document custom configurations** specific to your deployment

## 🤝 Contributing

When extending the infrastructure:

1. Maintain consistency across all three clouds
2. Update all READMEs with new features
3. Test in all three cloud environments
4. Document cost implications
5. Update comparison tables

## 📞 Support & Resources

- **Azure**: [infra/azure/README.md](./azure/README.md)
- **AWS**: [infra/aws/README.md](./aws/README.md)
- **GCP**: [infra/gcp/README.md](./gcp/README.md)
- **Main Infrastructure Guide**: [infra/README.md](./README.md)

---

**Infrastructure Version**: 1.0  
**Last Updated**: 2024  
**Maintainer**: HOPTranscribe Team
