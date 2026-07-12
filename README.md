# DonNation

Plateforme de dons associatifs — NestJS, Next.js, Stripe Connect, reçus NFT on-chain (Anvil / Base).

## OpenSSF Scorecard

[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/ossf/scorecard/badge)](https://scorecard.dev/viewer/?uri=github.com/ossf/scorecard)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/5621/badge)](https://www.bestpractices.dev/projects/5621)
[![build](https://github.com/ossf/scorecard/actions/workflows/main.yml/badge.svg)](https://github.com/ossf/scorecard/actions/workflows/main.yml)
[![CodeQL](https://github.com/ossf/scorecard/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/ossf/scorecard/actions/workflows/codeql-analysis.yml)
[![Go Reference](https://pkg.go.dev/badge/github.com/ossf/scorecard/v4.svg)](https://pkg.go.dev/github.com/ossf/scorecard/v4)
[![Go Report Card](https://goreportcard.com/badge/github.com/ossf/scorecard/v4)](https://goreportcard.com/report/github.com/ossf/scorecard/v4)
[![codecov](https://codecov.io/gh/ossf/scorecard/branch/main/graph/badge.svg?token=PMJ6NAN9J3)](https://codecov.io/gh/ossf/scorecard)
[![SLSA 3](https://slsa.dev/images/gh-badge-level3.svg)](https://slsa.dev)
[![Slack](https://img.shields.io/badge/slack-openssf/scorecard-white.svg?logo=slack)](https://slack.openssf.org/#scorecard)


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
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
docker compose -f docker-compose.dev.yml up --build
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
