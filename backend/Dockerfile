FROM node:18-alpine AS builder
WORKDIR /app

# Install deps (including dev for build)
COPY package*.json ./
RUN npm ci

# Copy sources
COPY . .

# Generate Prisma client (needed for TypeScript types and runtime client)
# ensures @prisma/client generated artifacts are available for build
RUN npx prisma generate

# Build the app
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install only production deps
COPY package*.json ./
RUN npm ci --only=production

# Copy built artifacts and prisma schema if present
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Copy generated Prisma client from builder so runtime has the client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000

CMD ["node", "dist/main.js"]
