# AWS Infrastructure - Terraform

This directory contains Terraform configurations for deploying HOPTranscribe to AWS using ECS Fargate.

## 📁 Files

- `main.tf` - Main infrastructure resources (VPC, ECS, ALB, ECR)
- `variables.tf` - Input variables and validation
- `outputs.tf` - Output values after deployment
- `terraform.tfvars.example` - Example configuration file

## 🚀 Quick Start

### Prerequisites

1. **AWS CLI** installed and configured
2. **Terraform** >= 1.0 installed
3. **OpenAI API Key**

### 1. Configure AWS Credentials

```bash
# Configure AWS CLI
aws configure

# Or use environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

### 2. Configure Variables

```bash
# Copy example config
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values
nano terraform.tfvars
```

### 3. Set OpenAI API Key (Secure Method)

**Option A: Environment Variable (Recommended)**
```bash
export TF_VAR_openai_api_key="sk-proj-your-key-here"
```

**Option B: Pass via CLI**
```bash
terraform apply -var="openai_api_key=sk-proj-your-key-here"
```

### 4. Initialize Terraform

```bash
terraform init
```

### 5. Plan Deployment

```bash
terraform plan
```

### 6. Apply Configuration

```bash
terraform apply
```

Review the plan and type `yes` to confirm.

### 7. Get Outputs

```bash
terraform output

# Application URLs
terraform output frontend_url
terraform output backend_url
terraform output alb_dns_name
```

## 📊 Resource Overview

This Terraform configuration creates:

- ✅ VPC with public subnets across 2 AZs
- ✅ Internet Gateway and Route Tables
- ✅ Security Groups (ALB and ECS Tasks)
- ✅ Application Load Balancer
- ✅ ECR Repositories (Backend and Frontend)
- ✅ ECS Cluster (Fargate)
- ✅ ECS Task Definitions
- ✅ ECS Services with Auto-Scaling
- ✅ CloudWatch Log Groups
- ✅ AWS Secrets Manager for OpenAI key
- ✅ IAM Roles and Policies

## ⚙️ Configuration Options

### Environment Types

**Development (dev)**:
```hcl
environment            = "dev"
backend_cpu            = 512
backend_memory         = 1024
backend_desired_count  = 1
backend_min_capacity   = 1
backend_max_capacity   = 2
```

**Staging (staging)**:
```hcl
environment            = "staging"
backend_cpu            = 1024
backend_memory         = 2048
backend_desired_count  = 2
backend_min_capacity   = 2
backend_max_capacity   = 4
```

**Production (prod)**:
```hcl
environment            = "prod"
backend_cpu            = 2048
backend_memory         = 4096
backend_desired_count  = 2
backend_min_capacity   = 2
backend_max_capacity   = 6
```

### CPU/Memory Combinations

AWS Fargate valid combinations:

| CPU (units) | Memory Options (MB) |
|-------------|---------------------|
| 256 (0.25 vCPU) | 512, 1024, 2048 |
| 512 (0.5 vCPU) | 1024, 2048, 3072, 4096 |
| 1024 (1 vCPU) | 2048, 3072, 4096, 5120, 6144, 7168, 8192 |
| 2048 (2 vCPU) | 4096 - 16384 (1GB increments) |
| 4096 (4 vCPU) | 8192 - 30720 (1GB increments) |

### Auto-Scaling

Auto-scaling triggers when CPU utilization exceeds 70%:

**Backend Scaling**:
- Min: 1 task
- Max: 3 tasks (configurable)
- Target: 70% CPU

**Frontend Scaling**:
- Min: 1 task
- Max: 5 tasks (configurable)
- Target: 70% CPU

### Cost Optimization

**Development (Low Cost)**:
```hcl
backend_cpu           = 512
backend_memory        = 1024
backend_desired_count = 1
backend_min_capacity  = 1
frontend_cpu          = 256
frontend_memory       = 512
```
**Est. Cost**: ~$40-60/month

**Production (High Availability)**:
```hcl
backend_cpu           = 2048
backend_memory        = 4096
backend_desired_count = 2
backend_min_capacity  = 2
frontend_cpu          = 512
frontend_memory       = 1024
```
**Est. Cost**: ~$150-200/month

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
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
```

### 3. Use Remote State (Production)

```hcl
# In main.tf
terraform {
  backend "s3" {
    bucket         = "terraform-state-hoptranscribe"
    key            = "hoptranscribe.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"
  }
}
```

**Create S3 backend**:
```bash
# Create S3 bucket for state
aws s3 mb s3://terraform-state-hoptranscribe

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket terraform-state-hoptranscribe \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for locking
aws dynamodb create-table \
  --table-name terraform-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
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
terraform output frontend_url

# Destroy all resources
terraform destroy

# Format code
terraform fmt

# View logs
aws logs tail /ecs/hoptranscribe-dev/backend --follow
aws logs tail /ecs/hoptranscribe-dev/frontend --follow

# Describe ECS services
aws ecs describe-services \
  --cluster hoptranscribe-dev-cluster \
  --services hoptranscribe-dev-backend
```

## 🔄 Updating Infrastructure

### Update Container Images

1. **Build and push images to ECR**:

```bash
# Get ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $(terraform output -raw backend_ecr_repository_url)

# Build and push backend
docker build -t $(terraform output -raw backend_ecr_repository_url):latest src/be/
docker push $(terraform output -raw backend_ecr_repository_url):latest

# Build and push frontend
docker build -t $(terraform output -raw frontend_ecr_repository_url):latest src/fe/
docker push $(terraform output -raw frontend_ecr_repository_url):latest
```

2. **Force new deployment**:

```bash
# Update backend service
aws ecs update-service \
  --cluster hoptranscribe-dev-cluster \
  --service hoptranscribe-dev-backend \
  --force-new-deployment

# Update frontend service
aws ecs update-service \
  --cluster hoptranscribe-dev-cluster \
  --service hoptranscribe-dev-frontend \
  --force-new-deployment
```

### Change Configuration

```bash
# Edit terraform.tfvars
nano terraform.tfvars

# Preview changes
terraform plan

# Apply changes
terraform apply
```

## 🐛 Troubleshooting

### Authentication Issues

```bash
# Verify AWS credentials
aws sts get-caller-identity

# Configure AWS CLI
aws configure

# Use named profile
export AWS_PROFILE=your-profile
```

### ECS Task Not Starting

```bash
# Check service events
aws ecs describe-services \
  --cluster hoptranscribe-dev-cluster \
  --services hoptranscribe-dev-backend

# Check task logs
aws logs tail /ecs/hoptranscribe-dev/backend --follow

# Check task definition
aws ecs describe-task-definition \
  --task-definition hoptranscribe-dev-backend
```

### Target Group Unhealthy

```bash
# Check target health
aws elbv2 describe-target-health \
  --target-group-arn $(terraform output -raw backend_target_group_arn)

# Verify health check endpoint
curl http://$(terraform output -raw alb_dns_name)/health/status
```

### State Lock Issues

```bash
# Force unlock (if lock is stale)
terraform force-unlock <LOCK_ID>
```

### High Costs

```bash
# Review CloudWatch metrics
# Check ECS service desired count vs running count
aws ecs describe-services \
  --cluster hoptranscribe-dev-cluster \
  --services hoptranscribe-dev-backend hoptranscribe-dev-frontend

# Scale down services
aws ecs update-service \
  --cluster hoptranscribe-dev-cluster \
  --service hoptranscribe-dev-backend \
  --desired-count 0
```

## 🧹 Cleanup

### Destroy All Resources

```bash
terraform destroy
```

⚠️ **Warning**: This will delete all resources including data!

### Selective Cleanup

```bash
# Destroy frontend only
terraform destroy -target=aws_ecs_service.frontend
```

## 💰 Cost Breakdown

### Development Environment
- **ECS Fargate**: ~$30-40/month (1 backend, 1 frontend)
- **ALB**: ~$20/month
- **ECR**: ~$1/month
- **CloudWatch Logs**: ~$5/month
- **Total**: ~$55-65/month

### Production Environment
- **ECS Fargate**: ~$100-120/month (2 backend, 2 frontend)
- **ALB**: ~$20/month
- **ECR**: ~$2/month
- **CloudWatch Logs**: ~$10/month
- **Secrets Manager**: ~$1/month
- **Total**: ~$130-155/month

## 📚 Additional Resources

- [AWS ECS Fargate Pricing](https://aws.amazon.com/fargate/pricing/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [ECS Task Definition Parameters](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html)
- [AWS CLI ECS Reference](https://docs.aws.amazon.com/cli/latest/reference/ecs/)
