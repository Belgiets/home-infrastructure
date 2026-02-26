FROM --platform=linux/amd64 node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma/ ./prisma/

RUN npm ci

# Generate Prisma client for the target platform (linux/amd64)
# Writes into node_modules/.prisma/client (default location)
RUN npx prisma generate

COPY . .

RUN npm run build


FROM --platform=linux/amd64 node:20-alpine AS runner
WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

# Copy Prisma client generated for linux/amd64 from builder
# (node_modules/.prisma/client contains platform-specific binaries)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy compiled application
COPY --from=builder /app/dist ./dist

# Copy Prisma schema (needed for prisma migrate deploy at startup)
COPY prisma/ ./prisma/

EXPOSE 3000

# Run migrations then start the app
# Cloud Run sets PORT=8080 — the app reads process.env.PORT ?? 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
