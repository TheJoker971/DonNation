FROM node:18-alpine AS builder
WORKDIR /app
# Use development env during build so devDependencies (tailwind, etc.) are installed
ENV NODE_ENV=development

# Install deps (use npm ci for deterministic installs)
COPY . .

# Install deps (after copying sources to ensure any local path deps resolve)
RUN npm ci

# Build
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
