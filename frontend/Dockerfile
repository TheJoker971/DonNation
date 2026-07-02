FROM node:18-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production

# Install deps (use npm ci for deterministic installs)
COPY package*.json ./
RUN npm ci

# Copy sources and build
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install only production deps in final image
COPY package*.json ./
RUN npm ci --only=production

# Copy build output and public assets
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 3000

CMD ["npm", "run", "start"]
