# Secret Manager Setup Guide

After running `terraform apply`, the Secret Manager secrets are created but have no values. You need to set the values before the VM can start successfully.

## Quick Setup

### Option 1: GCP Console (Easiest)

1. Go to Secret Manager: https://console.cloud.google.com/security/secret-manager

2. Set username:
    - Click on `camera-ftp-username-dev` (or `-prod`)
    - Click "NEW VERSION"
    - Enter: `camera`
    - Click "ADD NEW VERSION"

3. Set password:
    - Click on `camera-ftp-password-dev` (or `-prod`)
    - Click "NEW VERSION"
    - Enter your secure password
    - Click "ADD NEW VERSION"

### Option 2: gcloud CLI

```bash
# Set username
echo -n "camera" | gcloud secrets versions add camera-ftp-username-dev --data-file=-

# Set password (interactive - recommended)
read -sp "Enter FTP password: " FTP_PASS && echo
echo -n "$FTP_PASS" | gcloud secrets versions add camera-ftp-password-dev --data-file=-
```

## Verify Secrets Are Set

```bash
# Check if versions exist (won't show values)
gcloud secrets versions list camera-ftp-username-dev
gcloud secrets versions list camera-ftp-password-dev

# Both should show at least one version with STATE: ENABLED
```

## After Setting Secrets

Deploy or restart the VM:

```bash
cd iac/terraform

# First deployment or if VM doesn't exist yet
terraform apply -var-file="environments/dev.tfvars"

# Or restart existing VM
gcloud compute ssh camera-ingestion-dev --zone=europe-central2-a \
  --command="cd /opt/camera-ingestion && sudo docker-compose restart"
```

## Updating Secrets Later

### Change Password

**Via Console:**
1. Go to Secret Manager
2. Click `camera-ftp-password-dev`
3. Click "NEW VERSION"
4. Enter new password
5. Restart services: `gcloud compute ssh camera-ingestion-dev --zone=europe-central2-a --command="cd /opt/camera-ingestion && sudo docker-compose restart"`

**Via CLI:**
```bash
# Update password
read -sp "Enter new FTP password: " NEW_PASS && echo
echo -n "$NEW_PASS" | gcloud secrets versions add camera-ftp-password-dev --data-file=-

# Restart FTP server to use new password
gcloud compute ssh camera-ingestion-dev --zone=europe-central2-a \
  --command="cd /opt/camera-ingestion && sudo docker-compose restart ftp-server"
```

## Security Best Practices

1. **Never commit secrets to Git** - They're managed in Secret Manager, not in code
2. **Use strong passwords** - At least 16 characters, random
3. **Rotate regularly** - Update passwords every 90 days
4. **Audit access** - Check who accessed secrets:
   ```bash
   gcloud logging read "resource.type=secret_manager_secret AND resource.labels.secret_id=camera-ftp-password-dev" --limit 50
   ```
5. **Delete old versions** - After rotating, disable old versions:
   ```bash
   gcloud secrets versions disable VERSION_NUMBER --secret=camera-ftp-password-dev
   ```

## Troubleshooting

### VM fails to start with "secret not found" error

Check startup logs:
```bash
gcloud compute instances get-serial-port-output camera-ingestion-dev --zone=europe-central2-a | grep -i secret
```

This usually means secrets don't have values. Set them using the steps above.

### "Permission denied" accessing secrets

Check service account has access:
```bash
gcloud secrets get-iam-policy camera-ftp-password-dev
```

Should show the VM's service account with `roles/secretmanager.secretAccessor`.

### Want to see the actual secret value?

```bash
# Be careful - this displays the secret in plaintext!
gcloud secrets versions access latest --secret=camera-ftp-password-dev
```

## Secret Naming Convention

Secrets follow this pattern:
- `camera-ftp-username-{environment}` - FTP username (e.g., "camera")
- `camera-ftp-password-{environment}` - FTP password

Where `{environment}` is either `dev` or `prod`.

## Cost

Secret Manager pricing:
- First 6 secret versions per month: **Free**
- Additional versions: $0.06/version/month
- Secret access operations: $0.03 per 10,000 operations

For this project: **$0** (within free tier with 2 secrets)