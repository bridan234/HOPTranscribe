# GCP Infrastructure - Terraform

This directory contains Terraform configurations for deploying HOPTranscribe to Google Cloud Platform using Cloud Run.

## 📁 Files

- `main.tf` - Main infrastructure resources (Cloud Run, Artifact Registry, Secret Manager)
- `variables.tf` - Input variables and validation
- `outputs.tf` - Output values after deployment
- `terraform.tfvars.example` - Example configuration file

## 🚀 Quick Start

### Prerequisites

1. **gcloud CLI** installed and authenticated
2. **Terraform** >= 1.0 installed
3. **GCP Project** created
4. **OpenAI API Key**

### 1. Authenticate with GCP

```bash
# Login to GCP
gcloud auth application-default login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Enable billing (if not already enabled)
gcloud billing accounts list
gcloud billing projects link YOUR_PROJECT_ID --billing-account=BILLING_ACCOUNT_ID
```

### 2. Configure Variables

```bash
# Copy example config
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values
nano terraform.tfvars

# IMPORTANT: Set your GCP project ID
# project_id = "your-gcp-project-id"
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

Review the plan and type `yes` to confirm. Initial deployment may take 5-10 minutes.

### 7. Get Outputs

```bash
terraform output

# Application URLs
terraform output frontend_url
terraform output backend_url
```

## 📊 Resource Overview

This Terraform configuration creates:

- ✅ Artifact Registry repository
- ✅ Secret Manager secret (OpenAI key)
- ✅ Service Account for Cloud Run
- ✅ IAM bindings for secret access
- ✅ Backend Cloud Run service
- ✅ Frontend Cloud Run service
- ✅ Public access IAM policies
- ✅ Optional: Cloud Load Balancer (for custom domain)

## ⚙️ Configuration Options

### Environment Types

**Development (dev)**:
```hcl
environment             = "dev"
backend_min_instances   = 0  # Scale to zero
backend_max_instances   = 2
backend_cpu             = "1"
backend_memory          = "1Gi"
frontend_min_instances  = 0
frontend_max_instances  = 3
frontend_cpu            = "1"
frontend_memory         = "512Mi"
```

**Staging (staging)**:
```hcl
environment             = "staging"
backend_min_instances   = 1
backend_max_instances   = 3
backend_cpu             = "2"
backend_memory          = "2Gi"
frontend_min_instances  = 1
frontend_max_instances  = 5
frontend_cpu            = "1"
frontend_memory         = "1Gi"
```

**Production (prod)**:
```hcl
environment             = "prod"
backend_min_instances   = 2  # Always available
backend_max_instances   = 6
backend_cpu             = "2"
backend_memory          = "4Gi"
frontend_min_instances  = 2
frontend_max_instances  = 10
frontend_cpu            = "2"
frontend_memory         = "1Gi"
```

### CPU/Memory Configurations

Cloud Run supports these CPU values:
- `"1"` - 1 vCPU
- `"2"` - 2 vCPUs
- `"4"` - 4 vCPUs
- `"6"` - 6 vCPUs (requires min 2GB memory)
- `"8"` - 8 vCPUs (requires min 2GB memory)

Memory options: `"128Mi"`, `"256Mi"`, `"512Mi"`, `"1Gi"`, `"2Gi"`, `"4Gi"`, `"8Gi"`, `"16Gi"`, `"32Gi"`

### Scaling Behavior

Cloud Run automatically scales based on:
- **Request rate**: Scales up when requests increase
- **CPU/Memory utilization**: Scales based on resource usage
- **Scale-to-zero**: When `min_instances = 0`, scales down to 0 when idle (saves costs)

### Cost Optimization

**Development (Low Cost with Scale-to-Zero)**:
```hcl
backend_min_instances  = 0
backend_cpu           = "1"
backend_memory        = "1Gi"
frontend_min_instances = 0
frontend_cpu          = "1"
frontend_memory       = "512Mi"
```
**Est. Cost**: ~$10-20/month (only pay for active time)

**Production (High Availability)**:
```hcl
backend_min_instances  = 2
backend_cpu           = "2"
backend_memory        = "4Gi"
frontend_min_instances = 2
frontend_cpu          = "1"
frontend_memory       = "1Gi"
```
**Est. Cost**: ~$80-120/month

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
export TF_VAR_project_id="your-project-id"
```

### 3. Use Remote State (Production)

```hcl
# In main.tf
terraform {
  backend "gcs" {
    bucket = "terraform-state-hoptranscribe"
    prefix = "terraform/state"
  }
}
```

**Create GCS backend**:
```bash
# Create bucket for Terraform state
gsutil mb -p YOUR_PROJECT_ID -l us-central1 gs://terraform-state-hoptranscribe

# Enable versioning
gsutil versioning set on gs://terraform-state-hoptranscribe

# Set lifecycle policy to keep old versions
cat > lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [{
      "action": {"type": "Delete"},
      "condition": {"numNewerVersions": 3}
    }]
  }
}
EOF
gsutil lifecycle set lifecycle.json gs://terraform-state-hoptranscribe
```

### 4. Restrict Service Account Permissions

The created service account has minimal permissions:
- `secretmanager.secretAccessor` - Read OpenAI key
- `artifactregistry.reader` - Pull container images

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

# View Cloud Run logs
gcloud run services logs read hoptranscribe-dev-backend --region=us-central1 --tail
gcloud run services logs read hoptranscribe-dev-frontend --region=us-central1 --tail

# Describe Cloud Run services
gcloud run services describe hoptranscribe-dev-backend --region=us-central1
gcloud run services describe hoptranscribe-dev-frontend --region=us-central1
```

## 🔄 Updating Infrastructure

### Update Container Images

1. **Build and push images to Artifact Registry**:

```bash
# Get Artifact Registry URL
ARTIFACT_URL=$(terraform output -raw artifact_registry_url)

# Configure Docker authentication
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build and push backend
docker build -t $ARTIFACT_URL/hoptranscribe-backend:latest src/be/
docker push $ARTIFACT_URL/hoptranscribe-backend:latest

# Build and push frontend
docker build -t $ARTIFACT_URL/hoptranscribe-frontend:latest src/fe/
docker push $ARTIFACT_URL/hoptranscribe-frontend:latest
```

2. **Deploy new revision**:

```bash
# Cloud Run automatically deploys new images
# Or force new revision:
gcloud run services update hoptranscribe-dev-backend --region=us-central1
gcloud run services update hoptranscribe-dev-frontend --region=us-central1
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
# Re-authenticate
gcloud auth application-default login

# Verify project
gcloud config get-value project

# List projects
gcloud projects list

# Set project
gcloud config set project YOUR_PROJECT_ID
```

### API Not Enabled

```bash
# Enable required APIs manually
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable compute.googleapis.com

# List enabled services
gcloud services list --enabled
```

### Cloud Run Service Not Starting

```bash
# Check service status
gcloud run services describe hoptranscribe-dev-backend --region=us-central1

# View logs
gcloud run services logs read hoptranscribe-dev-backend --region=us-central1 --limit=50

# Check revisions
gcloud run revisions list --service=hoptranscribe-dev-backend --region=us-central1
```

### Permission Denied Errors

```bash
# Check IAM permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID

# Add required roles to your user
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="user:your-email@example.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="user:your-email@example.com" \
  --role="roles/iam.serviceAccountUser"
```

### State Lock Issues

```bash
# Force unlock (if lock is stale)
terraform force-unlock <LOCK_ID>
```

### Cold Start Issues

If experiencing slow cold starts with scale-to-zero:

```bash
# Set min instances to 1 to keep at least one instance warm
# Edit terraform.tfvars
backend_min_instances = 1
frontend_min_instances = 1

# Apply changes
terraform apply
```

## 🧹 Cleanup

### Destroy All Resources

```bash
terraform destroy
```

⚠️ **Warning**: This will delete all resources including secrets!

### Selective Cleanup

```bash
# Destroy frontend only
terraform destroy -target=google_cloud_run_v2_service.frontend
```

## 💰 Cost Breakdown

### Cloud Run Pricing Components
1. **CPU allocation** (per vCPU-second)
2. **Memory allocation** (per GiB-second)
3. **Requests** (per million)
4. **Network egress** (per GB)

### Development Environment (Scale-to-Zero)
- **Cloud Run**: ~$5-10/month (minimal idle time)
- **Artifact Registry**: ~$1/month (10GB storage)
- **Secret Manager**: ~$0.50/month
- **Total**: ~$6-12/month

### Production Environment (Always On)
- **Cloud Run**: ~$60-80/month (2 backend + 2 frontend instances)
- **Artifact Registry**: ~$2/month
- **Secret Manager**: ~$0.50/month
- **Load Balancer** (optional): ~$20/month
- **Total**: ~$65-105/month

### Cost Optimization Tips

1. **Use scale-to-zero for dev/staging**
2. **Reduce min_instances during off-peak hours**
3. **Right-size CPU and memory**
4. **Use Cloud CDN for frontend** (optional)
5. **Monitor with Cloud Monitoring** (free tier)

## 📚 Additional Resources

- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Terraform Google Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [gcloud CLI Reference](https://cloud.google.com/sdk/gcloud/reference/run)
- [Artifact Registry Documentation](https://cloud.google.com/artifact-registry/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
