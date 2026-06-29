# DonNation — Passation V1 (backend + blockchain + Stripe)

Document de contexte pour reprendre le projet : ce qui est fait, comment brancher l’environnement, tester le flux complet, et les pièges connus.

**Dernière mise à jour :** juin 2026  
**Branche :** `feature/backend` (commit `18a6141`, poussé sur GitHub)

---

## 1. Vision V1

Plateforme de donations transparentes pour associations.

### Inclus
- Auth JWT (admin / association / donateur)
- Création + validation d’associations
- Dons EUR via **Stripe Connect** (reversement vers l’asso)
- Reçus NFT on-chain (`DonationInvoices` ERC-721)
- Mint automatique après paiement Stripe
- Points fidélité (contrat déployé, désactivé par défaut)

### Exclu
- Frontend, marketplace, billetterie, QR, DAO, paiement crypto direct, parcours guest

### Décisions figées
| Sujet | Choix |
|-------|-------|
| Auth | Login **obligatoire** avant don |
| Paiement | Stripe Connect Express, destination charges |
| Blockchain dev | **Anvil** local (`chainId 31337`) |
| Blockchain prod | **Base Sepolia** (`chainId 84532`) |
| Mint | Via `DonNationProtocol.mintInvoice()` uniquement |
| Wallet donateur | Wallet connecté ou `BLOCKCHAIN_CUSTODIAL_WALLET` |
| Metadata NFT | Hash off-chain en V1 ; IPFS = Phase 8 |

---

## 2. Structure du repo

```
DonNation/
├── GlobalDoc.md           # Vision globale (V2+ billetterie, etc.)
├── V1_HANDOFF.md          # Ce fichier
├── smart-contracts/       # Foundry, Solidity 0.8.30
│   ├── src/
│   │   ├── DonNationProtocol.sol
│   │   ├── DonationInvoices.sol
│   │   └── FidelityCard.sol
│   ├── script/DonNationProtocol.s.sol
│   └── test/
└── backend/               # NestJS + Prisma + PostgreSQL
    ├── prisma/schema.prisma
    ├── src/modules/
    │   ├── auth/
    │   ├── associations/
    │   ├── donations/
    │   ├── payments/
    │   ├── blockchain/
    │   └── health/
    └── test/              # 10 tests e2e
```

**Repo local recommandé :** `~/Developer/DonNation`  
⚠️ Éviter `~/Documents/DonNation` si iCloud est actif (erreurs Git `mmap failed`).

---

## 3. Smart contracts

### Architecture

```text
Wallet backend (owner du Protocol)
        ↓
DonNationProtocol
  ├─ registerAssociation(bytes32)
  ├─ setAssociationActive(bytes32)
  └─ mintInvoice(...) → DonationInvoices.mint(...)
```

- `DonationInvoices.mint()` est `onlyOwner` → owner = `DonNationProtocol` (ne pas changer)
- UUID asso PostgreSQL → `bytes32` via `keccak256(utf8(uuid))`  
  (voir `backend/src/modules/blockchain/utils/association-id.util.ts`)

### Déploiement local (Anvil)

```bash
# Terminal 1
cd smart-contracts && anvil
```

Copier la **clé privée du compte (0)** affichée par Anvil (pas l’adresse `0xf39F...`).

```bash
# Terminal 2
cd smart-contracts
forge script script/DonNationProtocol.s.sol:DonNationProtocolScript \
  --rpc-url http://127.0.0.1:8545 \
  --private-key <CLE_COMPTE_0_ANVIL> \
  --broadcast
```

Noter l’adresse `DonNationProtocol` dans les logs → `DON_NATION_PROTOCOL_ADDRESS` dans `backend/.env`.

**Dernières adresses (session de test — invalides si Anvil redémarré) :**

| Contrat | Adresse |
|---------|---------|
| DonNationProtocol | `0x0165878A594ca255338adfa4d48449f69242Eb8F` |
| DonationInvoices | `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853` |
| FidelityCard | `0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6` |

⚠️ **Anvil est éphémère** : redémarrage = redéploiement obligatoire.

### OpenZeppelin
Submodule piné **v5.0.2** (versions récentes cassent Foundry 0.2.0 avec `evm_version: osaka`).

```bash
cd smart-contracts/lib/openzeppelin-contracts && git checkout v5.0.2
```

### Base Sepolia (pas encore fait)
- Wallet déployeur sans ETH test au moment des tests
- Faucets : Coinbase CDP, Bware Labs

---

## 4. Backend — installation

### Prérequis
- Node.js 20+
- Docker Desktop
- Foundry (`forge`, `anvil`, `cast`)
- Stripe CLI (`stripe login`)

### Démarrage

```bash
# 1. Postgres
cd backend
docker compose up -d

# 2. Dépendances + DB
npm install
npx prisma migrate deploy
npm run prisma:seed

# 3. Anvil + déploiement contrats (voir §3)

# 4. Configurer .env (voir §5)

# 5. API
npm run start:dev

# 6. Webhooks Stripe (terminal dédié)
stripe listen \
  --forward-to localhost:3000/api/v1/payments/stripe/webhook \
  --forward-connect-to localhost:3000/api/v1/payments/stripe/webhook
```

Copier le `whsec_...` affiché par `stripe listen` → `STRIPE_WEBHOOK_SECRET` dans `.env`, puis redémarrer le backend.

### Vérification

```bash
curl http://localhost:3000/api/v1/health
# → "database":"up"
```

### Tests automatisés

```bash
cd backend
npm run test
npm run test:e2e    # 10/10
```

```bash
cd smart-contracts
forge test
```

---

## 5. Variables d’environnement (`backend/.env`)

Copier depuis `backend/.env.example`. Ne jamais committer `.env`.

```env
# App
PORT=3000
API_PREFIX=api/v1

# Database (Docker port 5433)
DATABASE_URL=postgresql://donnation:donnation@localhost:5433/donnation

# JWT
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=1h

# Admin (seed)
ADMIN_EMAIL=admin@donnation.local
ADMIN_PASSWORD=DonNationAdmin123!

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# Blockchain — DEV LOCAL (Anvil)
BASE_SEPOLIA_RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337
BLOCKCHAIN_PRIVATE_KEY=<meme cle que deploy Anvil compte 0>
DON_NATION_PROTOCOL_ADDRESS=<adresse apres forge script>
BLOCKCHAIN_CUSTODIAL_WALLET=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

# Blockchain — PROD (Base Sepolia, pas encore deploye)
# BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/...
# CHAIN_ID=84532
# BLOCKCHAIN_PRIVATE_KEY=<wallet owner Protocol>
# DON_NATION_PROTOCOL_ADDRESS=<adresse deployee>

# Phase 8 (pas utilise)
# PINATA_JWT=...
```

`smart-contracts/.env` : `BASE_SEPOLIA_RPC_URL` + `PRIVATE_KEY` pour Foundry.

**Redémarrer le backend** après chaque modification du `.env`.

---

## 6. Stripe Connect — setup plateforme

1. Dashboard [Stripe Connect](https://dashboard.stripe.com/connect) en mode **Test**
2. Type : **Plateforme** (pas Marketplace)
3. Compléter « Test Connect » dans le setup guide
4. `sk_test_...` → `STRIPE_SECRET_KEY`

La **Publishable key** (`pk_test_...`) est pour le front, pas le backend.

---

## 7. API — endpoints

Préfixe : `/api/v1`

| Méthode | Route | Auth | Rôle |
|---------|-------|------|------|
| GET | `/health` | Non | — |
| POST | `/auth/register` | Non | Crée DONOR |
| POST | `/auth/register/association` | Non | Crée ASSOCIATION (PENDING) |
| POST | `/auth/login` | Non | JWT |
| GET | `/auth/me` | Bearer | Profil |
| GET | `/associations` | Non | Catalogue public (APPROVED uniquement) |
| GET | `/associations/me` | Bearer | ASSOCIATION |
| POST | `/associations/me/stripe/onboard` | Bearer | ASSOCIATION |
| GET | `/admin/associations` | Bearer | ADMIN (filtre `?status=PENDING`) |
| PATCH | `/admin/associations/:id/approve` | Bearer | ADMIN |
| PATCH | `/admin/associations/:id/suspend` | Bearer | ADMIN |
| POST | `/donations` | Bearer | DONOR |
| GET | `/donations/me` | Bearer | DONOR |
| POST | `/donations/:id/pay` | Bearer | DONOR |
| GET | `/donations/:id` | Bearer | DONOR |
| POST | `/payments/stripe/webhook` | Signature Stripe | Public |

---

## 8. Flux métier complet

```text
1. Asso s'inscrit (POST /auth/register/association) → PENDING
2. Admin approuve (PATCH /admin/associations/:id/approve) → APPROVED + registerAssociation on-chain
3. Asso onboard Stripe (POST /associations/me/stripe/onboard) → URL formulaire
4. Asso complète KYC Stripe (mode test)
5. Webhook account.updated → stripeOnboardingComplete: true
6. Donateur crée don (POST /donations) → PENDING
7. Donateur paie (POST /donations/:id/pay) → clientSecret
8. Confirmation paiement (Stripe.js ou stripe payment_intents confirm)
9. Webhook payment_intent.succeeded
10. Backend : PAID → mintInvoice → COMPLETED + invoice MINTED (tokenId, txHash)
```

### Statuts donation
`PENDING` → `PAID` → `MINTING` → `COMPLETED` (ou `FAILED`)

---

## 9. Guide de test manuel (curl)

```bash
export BASE=http://localhost:3000/api/v1
```

### Comptes seed / test

| Rôle | Email | Password |
|------|-------|----------|
| Admin | `admin@donnation.local` | `DonNationAdmin123!` |
| Association | `asso@test.com` | `password123` |
| Donateur | `donor@test.com` | `password123` |

### Login et tokens

```bash
ASSO_TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"asso@test.com","password":"password123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

ADMIN_TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@donnation.local","password":"DonNationAdmin123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

DONOR_TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"donor@test.com","password":"password123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
```

### Lister les associations

```bash
# Catalogue public (donateur) — assos APPROVED uniquement
curl -s "$BASE/associations"

# Admin — toutes les assos, ou filtrer par statut
curl -s "$BASE/admin/associations?status=PENDING" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Sync on-chain (si asso approuvée avant déploiement Anvil)

```bash
ASSO_ID="3b05466d-16ee-4c09-bbc7-d5d3ca1daf7c"

curl -s -X PATCH "$BASE/admin/associations/$ASSO_ID/suspend" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

curl -s -X PATCH "$BASE/admin/associations/$ASSO_ID/approve" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Vérifier dans les logs backend : `registered on-chain`.  
Vérifier `onChainRegistered: true` via `GET /associations/me` (la réponse `approve` peut afficher `false` — bug UX connu).

### Vérifier on-chain

```bash
PROTOCOL=0x0165878A594ca255338adfa4d48449f69242Eb8F  # adapter si redeploy

cd backend
BYTES32=$(node -e "const {keccak256,toUtf8Bytes}=require('ethers'); console.log(keccak256(toUtf8Bytes('$ASSO_ID')))")

cast call $PROTOCOL "getAssociation(bytes32)(bool,bool,bool,string)" "$BYTES32" \
  --rpc-url http://127.0.0.1:8545
# Attendu : true true false
```

### Stripe onboard asso

```bash
curl -s -X POST "$BASE/associations/me/stripe/onboard" \
  -H "Authorization: Bearer $ASSO_TOKEN"
# → ouvrir l'url retournée dans le navigateur
```

404 sur `/association/stripe/return` à la fin = normal (pas de front).

Vérifier : `stripeOnboardingComplete: true` sur `/associations/me`.  
Si `false` : vérifier `stripe listen --forward-connect-to` et relancer, ou mettre à jour manuellement en dev.

### Don + paiement + mint

```bash
ASSO_ID="3b05466d-16ee-4c09-bbc7-d5d3ca1daf7c"

DONATION_ID=$(curl -s -X POST "$BASE/donations" \
  -H "Authorization: Bearer $DONOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"associationId\":\"$ASSO_ID\",\"amountEur\":5000}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['donation']['id'])")

curl -s -X POST "$BASE/donations/$DONATION_ID/pay" \
  -H "Authorization: Bearer $DONOR_TOKEN"
# → noter paymentIntentId

stripe payment_intents confirm <paymentIntentId> --payment-method pm_card_visa
```

Vérifier :

```bash
curl -s "$BASE/donations/$DONATION_ID" -H "Authorization: Bearer $DONOR_TOKEN"
```

Attendu : `status: COMPLETED`, `invoice.status: MINTED`, `tokenId`, `txHash`, `chainId: 31337`.

### Don test validé (référence)

- Donation ID : `9f04486b-d409-4c70-89e8-842fc774c02a`
- 50 €, NFT `tokenId: 1`
- Tx : `0x9b9745225b850de3fd31425972eb4d6964b0af9ab79285caaea6aae3477d8db9`
- PaymentIntent : `pi_3Tnebc2KOhHKe4ET1QSpDs5h`

---

## 10. Ce qui marche (validé)

| Composant | Statut |
|-----------|--------|
| Auth JWT | ✅ |
| Associations + approve admin | ✅ |
| Enregistrement on-chain (approve) | ✅ |
| Stripe Connect onboard | ✅ |
| Don + PaymentIntent | ✅ |
| Webhook payment_intent.succeeded | ✅ |
| Mint NFT auto post-paiement | ✅ |
| Tests e2e (10/10) | ✅ |
| Smart contracts + tests Foundry | ✅ |

---

## 11. Ce qui reste à faire

| Sujet | Phase |
|-------|-------|
| Frontend (Next.js) | — |
| Pages retour Stripe (`/association/stripe/return`) | — |
| Metadata IPFS + PDF | Phase 8 |
| Dashboards admin/asso/donateur | Phase 9 |
| Auth Web3 (Privy/Dynamic) | V2 |
| Déploiement Base Sepolia réel | — |
| PR `feature/backend` → main/dev | — |

---

## 12. Pièges connus

1. **`export BASE=http://localhost:3000/api/v1`** avant les curl
2. Stocker les tokens JWT dans des variables (`ASSO_TOKEN=...`)
3. **Anvil redémarré** → redéployer contrats + mettre à jour `.env`
4. **`--private-key`** = clé privée Anvil, pas l’adresse wallet
5. **`stripe listen`** : utiliser `--forward-connect-to` pour `account.updated`
6. **`amountEur`** en centimes (5000 = 50 €)
7. Blockchain désactivée si une des 3 vars manque (RPC, clé, adresse Protocol)
8. Ne pas travailler dans `~/Documents` avec iCloud pour Git
9. Réponse `approve` peut montrer `onChainRegistered: false` alors que c’est `true` en DB — vérifier via `/associations/me`

---

## 13. Fichiers clés

| Fichier | Rôle |
|---------|------|
| `backend/prisma/schema.prisma` | Modèles DB |
| `backend/src/modules/payments/stripe.service.ts` | Stripe Connect + webhooks |
| `backend/src/modules/blockchain/blockchain.service.ts` | Appels on-chain |
| `backend/src/modules/blockchain/donation-mint.service.ts` | Orchestration mint post-paiement |
| `smart-contracts/src/DonNationProtocol.sol` | Contrat central |
| `smart-contracts/script/DonNationProtocol.s.sol` | Script de déploiement |

---

## 14. Phases backend

| Phase | Contenu | Statut |
|-------|---------|--------|
| 1 | Architecture | ✅ |
| 2 | NestJS + Prisma | ✅ |
| 3 | Auth JWT | ✅ |
| 4 | Associations | ✅ |
| 5 | Donations | ✅ |
| 6 | Stripe Connect | ✅ |
| 7 | Blockchain mint | ✅ |
| 8 | IPFS + documents | ❌ |
| 9 | Dashboards | ❌ |
