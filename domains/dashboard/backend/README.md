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

### 3. Run database migrations

```bash
npm run prisma:migrate:deploy
```

### 4. GCS Signed URLs (Local Development)

The backend generates signed URLs for camera images. Signing requires a service account
with a private key — regular user credentials (`someemail@gmail.com`) can't sign URLs directly.
The solution is **impersonation**: your user account acts *on behalf of* a service account that has signing capability.

> **How ADC works:** `gcloud auth application-default login` writes credentials to
> `~/.config/gcloud/application_default_credentials.json`. Both the backend (Node.js SDK)
> and Terraform read from this same file. Switching between impersonation and normal login
> affects both tools — see the note below.

**One-time setup** — Grant yourself permission to impersonate:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  camera-ingestion-dev@home-infra-480109.iam.gserviceaccount.com \
  --member="user:YOUR_EMAIL@gmail.com" \
  --role="roles/iam.serviceAccountTokenCreator" \
  --project=home-infra-480109
```

**Before running the backend locally** — enable impersonation:

```bash
gcloud auth application-default login \
  --impersonate-service-account=camera-ingestion-dev@home-infra-480109.iam.gserviceaccount.com
```

**Before running Terraform** — disable impersonation (switch back to your user account):

```bash
gcloud auth application-default login
```

> **Why switch back for Terraform?** Terraform also reads ADC. When impersonation is active,
> Terraform runs as the service account which lacks permissions to manage GCP resources
> (Secret Manager, Cloud Run, etc.). Your user account has those permissions as project owner.

> **On Cloud Run:** No impersonation needed — Cloud Run automatically uses the attached
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
