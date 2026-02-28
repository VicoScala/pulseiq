# ── Stage 1: Build frontend ────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Build backend + serve frontend ────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Install all deps (including devDeps for tsc)
COPY backend/package*.json ./
RUN npm ci

# Build TypeScript
COPY backend/ ./
RUN npx tsc

# Copy frontend build into public/ (served statically by Express)
COPY --from=frontend-builder /frontend/dist ./public

# Remove devDependencies to slim the final image
RUN npm prune --production

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
