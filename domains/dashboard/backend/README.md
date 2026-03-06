# Dashboard Backend

NestJS backend for the Home Infrastructure Dashboard.

## Features

- **Authentication**: JWT-based auth with HTTP-only cookies (access + refresh tokens)
- **User Management**: Registration, login, logout with PostgreSQL/Prisma
- **Camera Files API**: Browse camera captures from MongoDB with signed GCS URLs

## Prerequisites

- Node.js 20+
- PostgreSQL (for users/auth)
- MongoDB (for camera files metadata)
- GCP access (for signed URLs)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Key variables:
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `MONGODB_URI` | MongoDB connection string (camera-ingestion DB) |
| `GCS_BUCKET` | GCS bucket name for camera images |
| `JWT_ACCESS_SECRET` | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens |
| `FRONTEND_URL` | Frontend URL for CORS |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account key JSON (for signed URLs) |

### 3. Run database migrations

```bash
npm run prisma:migrate:deploy
```

### 4. GCS Signed URLs (Local Development)

The backend generates signed URLs for camera images. Signing requires a service account
with a private key (`client_email`) — regular user credentials from `gcloud auth` can't sign URLs.

#### Option A: Service Account Key (Recommended)

One-time setup, no credential switching between backend and Terraform:

```bash
# Generate the key file
gcloud iam service-accounts keys create ./sa-dashboard-backend-dev.json \
  --iam-account=dashboard-backend-dev@home-infra-480109.iam.gserviceaccount.com
```

Add to your `.env`:

```env
GOOGLE_APPLICATION_CREDENTIALS=/Users/YOUR_USERNAME/sa-dashboard-backend-dev.json
```

That's it. The key file contains `client_email` and the private key needed for signing.

> **Security note:** Never commit the key file to git. The root `.gitignore` already
> ignores `service-account-key*.json` and `credentials.json`. Store it outside the repo
> (e.g., home directory).

#### Option B: Impersonation

Alternative if you prefer not to manage key files. Your user account acts *on behalf of* a service account:

```bash
# One-time: grant yourself permission to impersonate
gcloud iam service-accounts add-iam-policy-binding \
  dashboard-backend-dev@home-infra-480109.iam.gserviceaccount.com \
  --member="user:YOUR_EMAIL@gmail.com" \
  --role="roles/iam.serviceAccountTokenCreator" \
  --project=home-infra-480109

# Before running the backend
gcloud auth application-default login \
  --impersonate-service-account=dashboard-backend-dev@home-infra-480109.iam.gserviceaccount.com

# Before running Terraform (switch back to your user account)
gcloud auth application-default login
```

> **Why switch back for Terraform?** Terraform also reads ADC. When impersonation is active,
> Terraform runs as the service account which lacks permissions to manage GCP resources.

> **On Cloud Run:** No setup needed — Cloud Run automatically uses the attached
> service account (`dashboard-backend-dev`) which has `iam.serviceAccountTokenCreator`.

## Running

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Endpoints

### Auth
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login (sets HTTP-only cookies)
- `POST /auth/logout` - Logout (clears cookies)
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user (protected)

### Camera Files (protected)
- `GET /camera-files` - List files with pagination and filtering
- `GET /camera-files/stats` - Get upload statistics
- `GET /camera-files/:id` - Get single file details

## Testing

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

## Database Tools

```bash
# Prisma Studio (GUI for PostgreSQL)
npm run prisma:studio

# Create migration
npm run prisma:migrate:create

# Reset database
npm run prisma:reset
```
