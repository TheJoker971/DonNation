# DonNation — Documentation du projet

Point d’entrée pour savoir **quel fichier lire** selon ton rôle et ta tâche.

---

## Par où commencer ?

| Tu es… | Lis en priorité |
|--------|-----------------|
| **Nouveau sur le repo** | [`README.md`](./README.md) → [`V1_HANDOFF.md`](./V1_HANDOFF.md) |
| **Développeur frontend** | [`docs/POLISH.md`](./docs/POLISH.md) → [`docs/AUTH.md`](./docs/AUTH.md) → [`V1_HANDOFF.md`](./V1_HANDOFF.md) |
| **Développeur backend / blockchain** | [`V1_HANDOFF.md`](./V1_HANDOFF.md) → [`docs/AUTH.md`](./docs/AUTH.md) |
| **Product / vision long terme** | [`GlobalDoc.md`](./GlobalDoc.md) |

---

## Fichiers à prendre en compte

### Racine du monorepo

| Fichier | Contenu | Quand le lire |
|---------|---------|---------------|
| **[`README.md`](./README.md)** | Quickstart (6 terminaux + Docker) | Premier lancement |
| **[`DOCUMENTATION.md`](./DOCUMENTATION.md)** | Index de la doc (ce fichier) | Toujours en premier |
| **[`V1_HANDOFF.md`](./V1_HANDOFF.md)** | Passation V1 : architecture, setup, API, tests | Reprise backend, Stripe, Anvil |
| **[`FRONTEND_V1.md`](./FRONTEND_V1.md)** | Spec historique MVP frontend | Contexte uniquement |
| **[`docs/POLISH.md`](./docs/POLISH.md)** | Checklist polish UX / parcours | Soutenance, polish |
| **[`docs/AUTH.md`](./docs/AUTH.md)** | Google, MetaMask, reset asso/admin | Auth wallet + email |
| **[`docs/V2_STRIPE_USDC.md`](./docs/V2_STRIPE_USDC.md)** | USDC Stripe (compte FR) | Paiements crypto Stripe |
| **[`docker-compose.dev.yml`](./docker-compose.dev.yml)** | Stack dev unifiée | Alternative au setup manuel |
| **[`GlobalDoc.md`](./GlobalDoc.md)** | Vision produit long terme | Roadmap — hors périmètre V1 |

### Backend

| Fichier | Contenu |
|---------|---------|
| **[`backend/.env.example`](./backend/.env.example)** | JWT, wallet, Google, mail, Stripe, blockchain |

### Smart contracts

| Fichier | Contenu |
|---------|---------|
| [`smart-contracts/README.md`](./smart-contracts/README.md) | Foundry (`forge build`, `forge test`) |
| Déploiement Anvil | **`V1_HANDOFF.md`** § blockchain |

---

## Périmètre actuel vs vision

| | Actuel (polish V2) | Vision long terme |
|---|-------------------|-------------------|
| Auth donateur | Email, Google custodial, MetaMask | — |
| Reset MDP | Asso + Admin uniquement | — |
| Fidélité | Masquée frontend | Visible + gamification |
| Paiement | Stripe EUR (+ crypto si compte US) | USDC natif |
| Docs opérationnelles | `README`, `V1_HANDOFF`, `POLISH`, `AUTH` | `GlobalDoc.md` |

---

## Branche et état actuel

- Branche de travail : **`feature/connect-front-with-back`**
- Backend NestJS port **3001**, frontend Next.js port **3000**
- Flux don → Stripe → mint NFT validé en local (Anvil)
- CI : GitHub Actions + OpenSSF Scorecard
