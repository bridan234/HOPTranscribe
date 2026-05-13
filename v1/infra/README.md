# Infrastructure as Code (IaC)

This directory contains Terraform configurations for deploying HOPTranscribe to multiple cloud providers.

## 📁 Directory Structure

```
infra/
├── azure/          # Azure Container Apps deployment
├── aws/            # AWS ECS Fargate deployment
├── gcp/            # Google Cloud Run deployment
└── README.md       # This file
```

## ☁️ Cloud Provider Comparison

| Feature | Azure (ACA) | AWS (ECS Fargate) | GCP (Cloud Run) |
|---------|-------------|-------------------|-----------------|
| **Service** | Container Apps | ECS Fargate | Cloud Run |
| **Scale-to-Zero** | ✅ Yes | ❌ No | ✅ Yes |
| **Min Cost/Month** | ~$15-25 | ~$55-65 | ~$6-12 |
| **Prod Cost/Month** | ~$50-80 | ~$130-155 | ~$65-105 |
| **Auto-Scaling** | ✅ Built-in | ✅ Application Auto Scaling | ✅ Automatic |
| **Cold Start** | Low (~1-2s) | None (always on) | Low (~1-2s) |
| **Networking** | Managed Ingress | ALB + VPC | Managed |
| **Complexity** | Low | Medium | Low |
| **Best For** | Balanced cost/features | Enterprise/complex networking | Dev/staging, cost-sensitive |

## 🚀 Quick Start by Cloud

### Azure Container Apps
```bash
cd infra/azure
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
export TF_VAR_openai_api_key="your-key"
terraform init
terraform plan
terraform apply
```

### AWS ECS Fargate
```bash
cd infra/aws
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
export TF_VAR_openai_api_key="your-key"
terraform init
terraform plan
terraform apply
```

### Google Cloud Run
```bash
cd infra/gcp
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values (including project_id!)
export TF_VAR_openai_api_key="your-key"
terraform init
terraform plan
terraform apply
```

## 📋 Prerequisites

### Common Requirements
- Terraform >= 1.0
- OpenAI API Key
- Git (for version control)

### Azure-Specific
- Azure CLI installed and authenticated
- Azure subscription with permissions to create resources

### AWS-Specific
- AWS CLI installed and configured
- AWS account with appropriate IAM permissions
- VPC and networking knowledge helpful

### GCP-Specific
- gcloud CLI installed and authenticated
- GCP project created with billing enabled
- Required APIs will be enabled automatically

## ⚙️ Configuration Parameters

All cloud configurations support these key parameters:

### Environment Types
- `dev` - Development with scale-to-zero (where supported)
- `staging` - Staging with minimal redundancy
- `prod` - Production with high availability

### Scaling Parameters
- **Min instances/replicas**: 0 (scale-to-zero), 1, 2+
- **Max instances/replicas**: Configurable per workload
- **CPU**: Various sizes (0.25-8 vCPUs depending on provider)
- **Memory**: 512Mi - 32Gi depending on CPU

### Common Variables
```hcl
project_name          = "hoptranscribe"
environment           = "dev"  # dev, staging, prod
backend_min_instances = 0      # Scale-to-zero in dev
backend_max_instances = 3
frontend_min_instances = 0
frontend_max_instances = 5
openai_api_key        = "sk-proj-..."  # Via env var recommended
openai_voice          = "alloy"
```

## 🔐 Security Best Practices

### 1. Never Commit Secrets

Always add to `.gitignore`:
```
*.tfvars
.terraform/
*.tfstate
*.tfstate.backup
```

### 2. Use Environment Variables

```bash
# OpenAI API Key
export TF_VAR_openai_api_key="sk-proj-your-key-here"

# Cloud-specific credentials
# Azure: Already authenticated via `az login`
# AWS: Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
# GCP: Already authenticated via `gcloud auth application-default login`
```

### 3. Use Remote State (Production)

Each cloud provider has remote state backend support:

**Azure (Storage Account)**:
```hcl
backend "azurerm" {
  resource_group_name  = "terraform-state-rg"
  storage_account_name = "tfstate"
  container_name       = "tfstate"
  key                  = "hoptranscribe.tfstate"
}
```

**AWS (S3 + DynamoDB)**:
```hcl
backend "s3" {
  bucket         = "terraform-state-hoptranscribe"
  key            = "hoptranscribe.tfstate"
  region         = "us-east-1"
  encrypt        = true
  dynamodb_table = "terraform-lock"
}
```

**GCP (Cloud Storage)**:
```hcl
backend "gcs" {
  bucket = "terraform-state-hoptranscribe"
  prefix = "terraform/state"
}
```

## 📊 Cost Comparison

### Development Environment (with scale-to-zero)

| Cloud | Est. Monthly Cost | Notes |
|-------|------------------|-------|
| GCP | $6-12 | Best for dev, scale-to-zero |
| Azure | $15-25 | Good balance |
| AWS | $55-65 | No scale-to-zero, always on |

### Production Environment (high availability)

| Cloud | Est. Monthly Cost | Notes |
|-------|------------------|-------|
| Azure | $50-80 | Good balance of cost/features |
| GCP | $65-105 | Scales well |
| AWS | $130-155 | Most expensive, enterprise features |

## 🔄 Deployment Workflow

### 1. Choose Cloud Provider

Based on your requirements:
- **Lowest dev cost**: GCP (scale-to-zero)
- **Balanced**: Azure
- **Enterprise/Complex networking**: AWS
- **Existing infrastructure**: Match your current cloud

### 2. Configure Variables

```bash
cd infra/<cloud>
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars
```

### 3. Set Secrets

```bash
export TF_VAR_openai_api_key="your-key"
```

### 4. Initialize & Deploy

```bash
terraform init
terraform plan
terraform apply
```

### 5. Get Outputs

```bash
terraform output frontend_url
terraform output backend_url
```

### 6. Build & Push Images

Each cloud has different container registries:

**Azure (ACR)**:
```bash
az acr login --name $(terraform output -raw acr_login_server | cut -d. -f1)
docker build -t $(terraform output -raw acr_login_server)/hoptranscribe-be:latest src/be/
docker push $(terraform output -raw acr_login_server)/hoptranscribe-be:latest
```

**AWS (ECR)**:
```bash
aws ecr get-login-password | docker login --username AWS --password-stdin $(terraform output -raw backend_ecr_repository_url | cut -d/ -f1)
docker build -t $(terraform output -raw backend_ecr_repository_url):latest src/be/
docker push $(terraform output -raw backend_ecr_repository_url):latest
```

**GCP (Artifact Registry)**:
```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
docker build -t $(terraform output -raw artifact_registry_url)/hoptranscribe-backend:latest src/be/
docker push $(terraform output -raw artifact_registry_url)/hoptranscribe-backend:latest
```

## 🧪 Testing Your Deployment

After deployment, test your endpoints:

```bash
# Get URLs
FRONTEND_URL=$(terraform output -raw frontend_url)
BACKEND_URL=$(terraform output -raw backend_url)

# Test backend health
curl $BACKEND_URL/health/status

# Test frontend
curl $FRONTEND_URL

# Open in browser
open $FRONTEND_URL  # macOS
xdg-open $FRONTEND_URL  # Linux
start $FRONTEND_URL  # Windows
```

## 🔧 Common Commands

### Initialize
```bash
terraform init
```

### Plan (preview changes)
```bash
terraform plan
```

### Apply (deploy)
```bash
terraform apply
```

### Destroy (cleanup)
```bash
terraform destroy
```

### View outputs
```bash
terraform output
terraform output frontend_url
```

### Format code
```bash
terraform fmt -recursive
```

### Validate configuration
```bash
terraform validate
```

## 🐛 Troubleshooting

### Authentication Issues

**Azure**:
```bash
az login
az account set --subscription "Your Subscription"
```

**AWS**:
```bash
aws configure
aws sts get-caller-identity
```

**GCP**:
```bash
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

### State Lock Issues

```bash
# If state is locked and you're sure no one else is running Terraform
terraform force-unlock <LOCK_ID>
```

### API/Service Not Enabled

Most errors about disabled APIs can be resolved by enabling them:

**Azure**: Most services are enabled by default

**AWS**: Check IAM permissions

**GCP**: Run the Terraform apply again, or manually enable:
```bash
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

## 🧹 Cleanup

To destroy all resources and stop incurring costs:

```bash
# Navigate to your cloud directory
cd infra/<cloud>

# Destroy everything
terraform destroy

# Confirm by typing 'yes'
```

⚠️ **Warning**: This will permanently delete all resources!

## 📚 Additional Resources

### Azure
- [Azure Container Apps Documentation](https://learn.microsoft.com/azure/container-apps/)
- [Terraform AzureRM Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Azure Deployment Guide](./azure/README.md)

### AWS
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Deployment Guide](./aws/README.md)

### GCP
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Terraform Google Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [GCP Deployment Guide](./gcp/README.md)

### Terraform
- [Terraform Documentation](https://www.terraform.io/docs)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)

### CI/CD
- [GitHub Actions Guide](../docs/GITHUB_ACTIONS_GUIDE.md)
- [Multi-Cloud Summary](../docs/infrastructure/MULTI_CLOUD_SUMMARY.md)

## 🤝 Contributing

When adding new infrastructure configurations:

1. Follow existing naming conventions
2. Add comprehensive README in each cloud directory
3. Include terraform.tfvars.example with all variables
4. Document cost estimates
5. Add validation rules to variables
6. Test in dev environment first

## 📞 Support

For infrastructure issues:
1. Check cloud-specific README in `infra/<cloud>/README.md`
2. Review Terraform output and error messages
3. Check cloud provider status pages
4. Verify authentication and permissions
5. Ensure all required variables are set
