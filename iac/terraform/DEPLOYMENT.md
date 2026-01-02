# Terraform Deployment Guide

## Prerequisites

1. **Terraform installed:**
   ```bash
   # macOS
   brew install terraform
   
   # Or download from https://www.terraform.io/downloads
   ```

2. **GCloud CLI authenticated:**
   ```bash
   gcloud auth application-default login
   gcloud config set project home-infra-480109
   ```

3. **Enable required APIs:**
   ```bash
   gcloud services enable compute.googleapis.com
   gcloud services enable storage.googleapis.com
   gcloud services enable iam.googleapis.com
   gcloud services enable logging.googleapis.com
   gcloud services enable secretmanager.googleapis.com
   gcloud services enable artifactregistry.googleapis.com
   ```

4. **Build and push watcher Docker image to Artifact Registry:**
   ```bash
   # From domains/camera-ingestion/watcher directory
   cd domains/camera-ingestion/watcher
   
   # Get the Artifact Registry repository URL (after running terraform apply once)
   # Or use the expected format:
   export AR_LOCATION="europe-central2"
   export AR_REPO="${AR_LOCATION}-docker.pkg.dev/home-infra-480109/camera-ingestion-dev"
   
   # Configure Docker to use Artifact Registry
   gcloud auth configure-docker ${AR_LOCATION}-docker.pkg.dev
   
   # Build the image
   docker build -t ${AR_REPO}/camera-watcher:latest .
   
   # Push to Artifact Registry
   docker push ${AR_REPO}/camera-watcher:latest
   ```

   **Note:** You may need to create the Artifact Registry repository first by running `terraform apply` once, which will create the repository before the VM attempts to pull the image.

## Directory Structure

```
iac/terraform/
├── main.tf
├── variables.tf
├── outputs.tf
├── modules/
│   └── gcs-bucket/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── environments/
│   ├── dev.tfvars
│   └── prod.tfvars
└── scripts/
    └── startup.sh
```

## Deployment Steps

### 1. Initialize Terraform

```bash
cd iac/terraform
terraform init
```

### 2. Review the Plan

**For Development:**
```bash
terraform plan -var-file="environments/dev.tfvars"
```

**For Production:**
```bash
terraform plan -var-file="environments/prod.tfvars"
```

### 3. Apply the Configuration

**Step 3a: Create infrastructure:**
```bash
terraform apply -var-file="environments/dev.tfvars"
```

This will create:
- Artifact Registry repository
- Secret Manager secrets (empty, values set in next step)
- GCS bucket
- Service account with permissions
- Firewall rules
- *Note: VM creation will fail initially because secrets are empty*

**Step 3b: Set secret values via GCP Console:**

1. Go to Secret Manager: https://console.cloud.google.com/security/secret-manager
2. Find `camera-ftp-username-dev` and click on it
3. Click "NEW VERSION" and enter: `camera`
4. Find `camera-ftp-password-dev` and click on it
5. Click "NEW VERSION" and enter your secure password

**Alternative: Set secrets via gcloud CLI:**
```bash
# Set FTP username
echo -n "camera" | gcloud secrets versions add camera-ftp-username-dev --data-file=-

# Set FTP password (you'll be prompted to enter it)
read -s FTP_PASS && echo -n "$FTP_PASS" | gcloud secrets versions add camera-ftp-password-dev --data-file=-
```

**Step 3c: Build and push Docker image:**
```bash
# Get the repository URL from Terraform output
terraform output artifact_registry_repository

# Build and push
cd ../../domains/camera-ingestion/watcher
export AR_REPO=$(cd ../../../iac/terraform && terraform output -raw artifact_registry_repository)
gcloud auth configure-docker europe-central2-docker.pkg.dev
docker build -t ${AR_REPO}/camera-watcher:latest .
docker push ${AR_REPO}/camera-watcher:latest
cd ../../../iac/terraform
```

**Step 3d: Create/recreate VM:**
```bash
# If this is first deployment or if VM failed to start
terraform apply -var-file="environments/dev.tfvars"

# If VM already exists and needs to be recreated
terraform taint google_compute_instance.camera_ingestion
terraform apply -var-file="environments/dev.tfvars"
```

### 4. Get Outputs

```bash
terraform output

# Get specific outputs
terraform output vm_external_ip
terraform output gcs_bucket_name
terraform output ftp_connection_info
```

## Verify Deployment

### 1. Check VM is running

```bash
gcloud compute instances list --filter="name:camera-ingestion"
```

### 2. SSH into VM and check services

```bash
# SSH to VM
gcloud compute ssh camera-ingestion-dev --zone=europe-central2-a

# Check Docker containers
sudo docker ps

# Check logs
sudo docker logs camera-watcher
sudo docker logs camera-ftp

# Exit
exit
```

### 3. Test FTP connection

Use FileZilla or FTP client:
- Host: (output from `terraform output vm_external_ip`)
- Port: 21
- Username: camera
- Password: (what you set in terraform apply)

### 4. Verify GCS bucket

```bash
gcloud storage buckets describe gs://home-infra-480109-dev-camera-ingestion
```

## Configure Your Camera

1. Get the VM IP:
   ```bash
   terraform output vm_external_ip
   ```

2. In your Hikvision camera web interface:
    - Go to: Configuration → Network → Advanced Settings → FTP
    - Server Address: (VM IP from step 1)
    - Port: 21
    - Username: camera
    - Password: (your FTP password)
    - Directory: / (or leave empty)
    - Enable "Upload Picture"
    - Test the connection

## Updating the Deployment

### Update watcher code:

```bash
# 1. Build new image
cd domains/camera-ingestion/watcher
export AR_REPO=$(cd ../../../iac/terraform && terraform output -raw artifact_registry_repository)
docker build -t ${AR_REPO}/camera-watcher:latest .
docker push ${AR_REPO}/camera-watcher:latest

# 2. SSH to VM and restart
gcloud compute ssh camera-ingestion-dev --zone=europe-central2-a
cd /opt/camera-ingestion
sudo docker-compose pull watcher
sudo docker-compose up -d watcher
exit
```

### Update secrets:

```bash
# Update FTP password
gcloud secrets versions add camera-ftp-password-dev \
  --data-file=- <<< "new_password_here"

# Restart FTP server on VM to use new password
gcloud compute ssh camera-ingestion-dev --zone=europe-central2-a
cd /opt/camera-ingestion
sudo docker-compose restart ftp-server
exit
```

### View secrets (for debugging):

```bash
# List secrets
gcloud secrets list --filter="labels.domain=camera-ingestion"

# View secret value (be careful!)
gcloud secrets versions access latest --secret="camera-ftp-password-dev"
```

### Update infrastructure:

```bash
cd iac/terraform
terraform apply -var-file="environments/dev.tfvars"
```

## Managing Secrets

### View secret metadata (not values):
```bash
gcloud secrets describe camera-ftp-username-dev
gcloud secrets describe camera-ftp-password-dev
```

### Set/update secret values:

**Via GCP Console:**
1. Go to https://console.cloud.google.com/security/secret-manager
2. Click on the secret name
3. Click "NEW VERSION"
4. Enter the new value
5. Click "ADD NEW VERSION"

**Via gcloud CLI:**
```bash
# Update username
echo -n "new_username" | gcloud secrets versions add camera-ftp-username-dev --data-file=-

# Update password
echo -n "new_password" | gcloud secrets versions add camera-ftp-password-dev --data-file=-

# Or interactively (recommended for passwords)
read -s FTP_PASS && echo -n "$FTP_PASS" | gcloud secrets versions add camera-ftp-password-dev --data-file=-
```

**After updating secrets, restart services on VM:**
```bash
gcloud compute ssh camera-ingestion-dev --zone=europe-central2-a
cd /opt/camera-ingestion
sudo docker-compose restart
exit
```

## Destroy Infrastructure

**WARNING: This will delete the VM and all data!**

```bash
terraform destroy -var-file="environments/dev.tfvars"
```

## Troubleshooting

### VM not starting
- Check startup script logs:
  ```bash
  gcloud compute instances get-serial-port-output camera-ingestion-dev --zone=europe-central2-a
  ```

### Can't connect to FTP
- Check firewall rules:
  ```bash
  gcloud compute firewall-rules list --filter="name:camera-ingestion-ftp"
  ```
- Verify VM external IP:
  ```bash
  terraform output vm_external_ip
  ```

### Watcher not uploading
- SSH to VM and check logs:
  ```bash
  sudo docker logs camera-watcher -f
  ```
- Verify service account permissions:
  ```bash
  terraform output service_account_email
  ```

## Cost Optimization

**Development (e2-micro):**
- VM: ~$6-7/month (or free with always-free tier)
- Storage: ~$0.02/GB/month
- Network egress: Free for first 1GB/month

**Production (e2-small):**
- VM: ~$13-14/month
- Storage: ~$0.02/GB/month
- Network egress: $0.12/GB after free tier

**To reduce costs:**
- Use preemptible VMs (add `scheduling { preemptible = true }`)
- Set lifecycle policies to delete old images
- Use regional storage instead of multi-regional