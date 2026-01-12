## Install gcloud console and terraform(mac os)
``brew tap hashicorp/tap``  
``brew install hashicorp/tap/terraform``  
``terraform -version``  
``brew install --cask google-cloud-sdk``  
``gcloud auth login``  
``gcloud config set project YOUR_PROJECT_ID``  
``gcloud auth application-default set-quota-project YOUR_PROJECT_ID``

## Build and push as linux/amd64 (Apple Silicon compatible)
```
PROJECT_ID="YOUR_PROJECT_ID"
REGION="europe-west1"
REPO="ftp-repo"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/ftp-server:1"

# Ensure buildx is available and active
docker buildx create --use --name buildx-multi 2>/dev/null || docker buildx use buildx-multi

# Build amd64 and push
docker buildx build --platform linux/amd64 -t "${IMAGE}" --push .
```

## Other
Connect to ftp VM via ssh  
``gcloud compute ssh camera-ingestion-dev --project=home-infra-480109 --zone=europe-west1-b``

Restart GCE VM instance
``gcloud compute instances reset camera-ingestion-dev --zone europe-west1-b``

Debug GCE VM loading  
``gcloud compute instances get-serial-port-output camera-ingestion-dev --zone europe-west1-b --port 1 --start 0 | tail -n 300``

Other container logs  
```
sudo tail -n 200 /var/log/syslog
sudo tail -n 200 /var/log/daemon.log
sudo tail -n 200 /var/log/cloud-init-output.log
sudo ls -la /var/log/google-startup-scripts.log 2>/dev/null || true
sudo tail -n 200 /var/log/google-startup-scripts.log 2>/dev/null || true
```