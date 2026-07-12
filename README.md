# DonNation

Plateforme de dons associatifs — NestJS, Next.js, Stripe Connect, reçus NFT on-chain (Anvil / Base).

[![CI](https://github.com/TheJoker971/DonNation/actions/workflows/ci.yml/badge.svg)](https://github.com/TheJoker971/DonNation/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/TheJoker971/DonNation/badge)](https://scorecard.dev/viewer/?uri=github.com/TheJoker971/DonNation)
[![License: MIT](https://img.shields.io/github/license/TheJoker971/DonNation)](LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/TheJoker971/DonNation)](https://github.com/TheJoker971/DonNation/commits/main)


## Démarrage rapide (manuel — recommandé)

### Prérequis

- Node.js 20+, Docker, Foundry (`forge`, `anvil`), Stripe CLI (webhooks)

### 1. Base de données

```bash
cd backend && docker compose up -d
```

Postgres écoute sur **5433**.

### 2. Backend

```bash
cd backend
cp .env.example .env   # compléter Stripe, blockchain, Google, mail
npm ci
npx prisma migrate deploy
npm run prisma:seed
npm run build
PORT=3001 npm run start:prod
```

API : `http://localhost:3001/api/v1`

### 3. Blockchain (Anvil)

```bash
cd smart-contracts && anvil
```

```bash
cd smart-contracts
forge script script/DonNationProtocol.s.sol:DonNationProtocolScript \
  --rpc-url http://127.0.0.1:8545 \
  --private-key <CLE_COMPTE_0_ANVIL> \
  --broadcast
```

Copier `DON_NATION_PROTOCOL_ADDRESS` dans `backend/.env`.

### 4. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm ci
npm run dev
```

UI : `http://localhost:3000`

### 5. Stripe webhooks (hors Docker)

```bash
stripe listen --forward-to localhost:3001/api/v1/payments/stripe/webhook \
  --forward-connect-to localhost:3001/api/v1/payments/stripe/webhook
```

## Docker unifié (alternative)

```bash
cd docker-donnation
docker compose -f docker-compose.local.yml up --build or docker compose -f docker-compose.prod.yml up --build
```

Si le déploiement auto des contrats échoue, utiliser le démarrage manuel ci-dessus.

## Comptes seed (dev)

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@donnation.local | (voir `ADMIN_PASSWORD` dans `.env`) |
| Association | asso@test.com | password123 |
| Donateur | donor@test.com | password123 |

## Documentation

| Fichier | Contenu |
|---------|---------|
| [`DOCUMENTATION.md`](./DOCUMENTATION.md) | Index |
| [`V1_HANDOFF.md`](./V1_HANDOFF.md) | Setup détaillé, API, pièges |
| [`docs/AUTH.md`](./docs/AUTH.md) | Google, MetaMask, reset mot de passe |
| [`docs/POLISH.md`](./docs/POLISH.md) | Checklist polish UX |

## CI

GitHub Actions : lint, tests backend/frontend, `forge test`, OpenSSF Scorecard (voir [`.github/workflows/`](./.github/workflows/)).
