FROM node:20-alpine AS builder
WORKDIR /app

# Install deps (including dev for build)
COPY package*.json ./
RUN npm ci

# Copy sources
COPY . .

# Ensure stale incremental build state is not reused inside Docker
RUN rm -f tsconfig.build.tsbuildinfo

# Generate Prisma client (needed for TypeScript types and runtime client)
# ensures @prisma/client generated artifacts are available for build
RUN npx prisma generate

# Build the app
RUN npm run build

# Compile seed.ts to plain JS so the runner can execute it without ts-node
RUN node_modules/.bin/tsc prisma/seed.ts \
    --esModuleInterop --resolveJsonModule \
    --module commonjs --target ES2019 \
    --skipLibCheck --outDir dist-seed

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install only production deps
COPY package*.json ./
RUN npm ci --only=production

# Copy built artifacts and prisma schema
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-seed ./dist-seed
COPY --from=builder /app/prisma ./prisma

# Copy generated Prisma client from builder so runtime has the client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000

CMD ["node", "dist/main.js"]
