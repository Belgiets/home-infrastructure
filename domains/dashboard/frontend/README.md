# Dashboard Frontend

Next.js 16 frontend for the Home Infrastructure Dashboard.

## Tech Stack

- **Next.js 16** with App Router
- **React 19**
- **Tailwind CSS 4**
- **TypeScript**

## Prerequisites

- Node.js 20+

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `.env` (local only) | Backend URL for browser requests. Set to `http://localhost:3000` locally |
| `BACKEND_URL` | Vercel env vars only | Cloud Run URL for server-side proxy rewrites. Do NOT set locally |

### How the API proxy works

The frontend and backend are deployed to different domains (Vercel and Cloud Run).
Browsers block cross-domain cookies, so the frontend uses Next.js rewrites to proxy
API requests through Vercel — making them same-origin.

**Local development:**
- `.env` has `NEXT_PUBLIC_API_URL=http://localhost:3000`
- `api.ts` uses this value directly — all requests go straight to `localhost:3000`
- The rewrites in `next.config.ts` are never triggered
- `BACKEND_URL` is not set and not needed

**On Vercel (production/preview):**
- `NEXT_PUBLIC_API_URL` is NOT set — defaults to `/api`
- `api.ts` makes requests to `/api/auth/login`, `/api/camera-files`, etc.
- Next.js rewrites match `/api/:path*` and proxy them to `BACKEND_URL` (Cloud Run)
- Cookies work because the browser sees same-origin requests

## Running

```bash
# Development (port 3001)
npm run dev

# Production build
npm run build

# Start production server
npm start
```

## Testing

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Deployment

Deployment is managed by Terraform using the Vercel provider. Pushing to `main` triggers
automatic production deployment via Vercel's GitHub integration.

Vercel environment variables (`BACKEND_URL`) are set via Terraform — see
`iac/terraform/modules/vercel/` for configuration.
