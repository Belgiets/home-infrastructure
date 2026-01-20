# Home Infrastructure - Camera Ingestion

Automated camera image ingestion system for cameras, uploading images via FTP to Google Cloud Storage.

## Architecture
```
Hikvision Camera → FTP Server (Docker) → File Watcher (TypeScript) → Google Cloud Storage
```

### Camera Setup

1. Get VM IP: `terraform output vm_external_ip`
2. Camera web interface → Configuration → Network → Advanced Settings → FTP
3. Configure:
    - Server: VM IP
    - Port: 21
    - Username: camera
    - Password: (from Secret Manager)
    - Directory: `/` (or empty)
    - Enable "Upload Picture"

## Tech Stack

- **Infrastructure**: Terraform, Google Cloud Platform
- **Compute**: Google Compute Engine (Ubuntu)
- **Storage**: Google Cloud Storage, Artifact Registry
- **DB**: Atlas, MongoDB
- **Secrets**: Secret Manager
- **Containers**: Docker, Docker Compose
- **FTP Server**: vsftpd (fauria/vsftpd)
- **Watcher**: Node.js 20, TypeScript
- **Monitoring**: Cloud Logging

## Cost Estimate

**Development (e2-micro):**
- VM: ~$6-7/month (or free with always-free tier)
- Storage: ~$0.02/GB/month
- Artifact Registry: ~$0.10/month
- Secret Manager: Free (within free tier)

**Total: ~$6-7/month** (or ~$0.12/month if using free tier VM)

## Security

- ✅ Credentials stored in Secret Manager (not in code)
- ✅ Service account with least-privilege IAM roles
- ✅ Firewall rules restricting FTP access
- ✅ All secrets excluded from version control
- ✅ Audit logging enabled

## Monitoring

View logs:
```bash
# Watcher logs
gcloud compute ssh camera-ingestion-dev --zone=us-central1-a \
  --command="sudo docker logs camera-watcher -f"

# FTP logs
gcloud compute ssh camera-ingestion-dev --zone=us-central1-a \
  --command="sudo docker logs camera-ftp -f"

# Or via Cloud Logging
gcloud logging read "resource.type=gce_instance" --limit 50
```

## Troubleshooting

See [iac/terraform/DEPLOYMENT.md#troubleshooting](iac/terraform/DEPLOYMENT.md#troubleshooting)