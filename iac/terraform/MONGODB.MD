# MongoDB Atlas Setup Guide

This guide will help you set up MongoDB Atlas for the camera ingestion project.

## Step 1: Create MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up for a free account
3. Verify your email address

## Step 2: Create Organization and Get API Keys

1. Log in to MongoDB Atlas: https://cloud.mongodb.com
2. Click on your profile (top right) → "Organization Access Manager"
3. Note your **Organization ID** from the URL: `https://cloud.mongodb.com/v2#/org/{YOUR_ORG_ID}/projects`
4. Go to "Access Manager" → "API Keys" tab
5. Click "Create API Key"
    - Description: `terraform-camera-ingestion`
    - Organization Permissions: `Organization Project Creator`
6. Click "Next" and **save the Public Key and Private Key** (you won't see them again!)
7. Add your current IP to the API Access List
8. Click "Done"

## Step 3: Set Environment Variables

```bash
# Add these to your ~/.bashrc or ~/.zshrc
export MONGODB_ATLAS_PUBLIC_KEY="your-public-key-here"
export MONGODB_ATLAS_PRIVATE_KEY="your-private-key-here"

# Or set them temporarily
export MONGODB_ATLAS_PUBLIC_KEY="your-public-key-here"
export MONGODB_ATLAS_PRIVATE_KEY="your-private-key-here"
```

## Step 4: Update Terraform Variables

Edit `iac/terraform/environments/dev.tfvars`:

```hcl
mongodb_atlas_org_id = "your-org-id-from-step-2"
```

## Step 5: Deploy with Terraform

```bash
cd iac/terraform

# Initialize the MongoDB Atlas provider
terraform init

# Plan to see what will be created
terraform plan -var-file="environments/dev.tfvars"

# Apply
terraform apply -var-file="environments/dev.tfvars"
```

This will create:
- MongoDB Atlas Project: `camera-ingestion-dev`
- MongoDB Cluster: `camera-cluster-dev` (M0 Free Tier)
- Database User: `camera-watcher-dev`
- IP Whitelist: Your GCP VM IP
- Secrets: MongoDB password and connection URI in Secret Manager

## Step 6: Verify MongoDB Connection

After deployment, you can verify the connection:

```bash
# Get the MongoDB URI from Secret Manager
gcloud secrets versions access latest --secret="camera-mongodb-uri-dev"

# SSH to VM and check watcher logs
gcloud compute ssh camera-ingestion-dev --zone=us-central1-a
sudo docker logs camera-watcher -f

# You should see: "MongoDB connected"
```

## Step 7: View Data in MongoDB Atlas

1. Go to https://cloud.mongodb.com
2. Select your project: `camera-ingestion-dev`
3. Click "Browse Collections"
4. Select database: `camera-ingestion`
5. Select collection: `files`
6. You should see uploaded file records

## MongoDB Atlas Free Tier Limits

- **Storage**: 512 MB
- **RAM**: Shared
- **Backups**: None (manual export only)
- **Connections**: 500 concurrent
- **Suitable for**: Development, small projects, testing

## Upgrading to Paid Tier

If you exceed free tier limits, you can upgrade to M10 (smallest paid tier):

1. In MongoDB Atlas, go to your cluster
2. Click "Edit Configuration"
3. Change cluster tier to M10
4. Update Terraform: Change `provider_instance_size_name = "M0"` to `"M10"`

**M10 Cost**: ~$57/month (billed hourly)

## Troubleshooting

### Error: "IP not whitelisted"

The VM IP needs to be in the IP Access List. Terraform should handle this automatically, but if you recreate the VM:

```bash
# Get new VM IP
terraform output vm_external_ip

# Terraform will update the IP access list on next apply
terraform apply -var-file="environments/dev.tfvars"
```

### Error: "Authentication failed"

Check that the MongoDB URI secret is correctly set:

```bash
gcloud secrets versions access latest --secret="camera-mongodb-uri-dev"
```

### Connection timeout

1. Check VM can reach MongoDB:
```bash
gcloud compute ssh camera-ingestion-dev --zone=us-central1-a
ping your-cluster.mongodb.net
```

2. Verify IP whitelist in Atlas console

### Can't see collections

Collections are created automatically when first document is inserted. Upload a file via FTP to create the `files` collection.

## Local Development with MongoDB

For local development, you can either:

### Option A: Use MongoDB Atlas (Recommended)

Add to `docker-compose.local.yml`:

```yaml
watcher:
  environment:
    - MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/camera-ingestion
```

### Option B: Use Local MongoDB

Add MongoDB container:

```yaml
services:
  mongodb:
    image: mongo:7
    container_name: camera-mongodb-local
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    networks:
      - camera-network

  watcher:
    environment:
      - MONGO_URI=mongodb://mongodb:27017/camera-ingestion

volumes:
  mongo-data:
```

## Security Best Practices

1. **Rotate API Keys** every 90 days
2. **Use specific IP allowlist** (not 0.0.0.0/0) in production
3. **Enable MFA** on your MongoDB Atlas account
4. **Audit logs** regularly in Atlas
5. **Set up alerts** for unusual activity

## Cost Monitoring

Monitor your MongoDB usage:

1. Atlas Dashboard → Metrics
2. Check:
    - Storage used
    - Connections
    - Operations/second
3. Set up billing alerts

## Next Steps

After MongoDB is set up:

1. Build and push updated watcher image with MongoDB support
2. Deploy to VM
3. Test file upload and verify data appears in MongoDB
4. Build dashboard to view images