FROM node:18-alpine AS builder
WORKDIR /app

# Allow passing build-time public envs (NEXT_PUBLIC_*) so Next can prerender during build
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}

# Copy package files first for caching
COPY package*.json ./

# Install all deps (including dev) so build has tailwind/postcss etc.
RUN npm ci

# Copy sources
COPY . .

# Ensure production mode during build for Next.js behaviour
ENV NODE_ENV=production

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
