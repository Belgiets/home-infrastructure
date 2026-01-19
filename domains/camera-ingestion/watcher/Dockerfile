FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
#RUN addgroup -g 1001 -S nodejs && \
#    adduser -S nodejs -u 1001
#
#USER nodejs

# Looks insecure, but I'm ok with that because the app is not accessible from outside
USER root

CMD ["node", "dist/index.js"]