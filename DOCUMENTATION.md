# DonNation — Documentation du projet

Point d’entrée pour savoir **quel fichier lire** selon ton rôle et ta tâche.

---

## Par où commencer ?

| Tu es… | Lis en priorité |
|--------|-----------------|
| **Nouveau sur le repo** | Ce fichier → [`V1_HANDOFF.md`](./V1_HANDOFF.md) |
| **Développeur frontend** | [`FRONTEND_V1.md`](./FRONTEND_V1.md) → [`V1_HANDOFF.md`](./V1_HANDOFF.md) (API, env, tests) |
| **Développeur backend / blockchain** | [`V1_HANDOFF.md`](./V1_HANDOFF.md) |
| **Product / vision long terme** | [`GlobalDoc.md`](./GlobalDoc.md) |

---

## Fichiers à prendre en compte

### Racine du monorepo

| Fichier | Contenu | Quand le lire |
|---------|---------|---------------|
| **[`DOCUMENTATION.md`](./DOCUMENTATION.md)** | Index de la doc (ce fichier) | Toujours en premier |
| **[`V1_HANDOFF.md`](./V1_HANDOFF.md)** | Passation V1 : architecture, setup local (Postgres, Anvil, Stripe), variables `.env`, endpoints API, tests curl, flux complet validé, pièges connus | Reprise du backend, tests e2e, déploiement contrats, intégration Stripe |
| **[`FRONTEND_V1.md`](./FRONTEND_V1.md)** | Spec frontend MVP : routes, auth JWT, Stripe Payment Element, pages retour Connect, ordre de dev, checklist | Développement de l’interface Next.js |
| **[`GlobalDoc.md`](./GlobalDoc.md)** | Vision produit long terme (billetterie NFT, QR, marketplace, crypto, etc.) | Comprendre la roadmap au-delà de la V1 — **ne pas confondre avec le périmètre V1 actuel** |

### Backend

| Fichier | Contenu | Quand le lire |
|---------|---------|---------------|
| **[`backend/.env.example`](./backend/.env.example)** | Template des variables d’environnement (DB, JWT, Stripe, blockchain) | Configuration locale du API NestJS |
| [`backend/README.md`](./backend/README.md) | README générique NestJS (install, scripts) | Commandes npm de base uniquement — le détail métier est dans `V1_HANDOFF.md` |

### Smart contracts

| Fichier | Contenu | Quand le lire |
|---------|---------|---------------|
| [`smart-contracts/README.md`](./smart-contracts/README.md) | README générique Foundry (`forge build`, `forge test`) | Commandes Foundry de base |
| — | Déploiement Anvil, adresses, clés test | Voir **`V1_HANDOFF.md`** § blockchain |

### À ignorer pour le produit DonNation

Les fichiers `.md` sous `smart-contracts/lib/` (OpenZeppelin, forge-std) sont de la **documentation des dépendances**, pas du projet. Ne pas les utiliser comme référence produit.

---

## Ordre de lecture recommandé (onboarding complet)

1. **`DOCUMENTATION.md`** — orientation
2. **`V1_HANDOFF.md`** — état réel du V1 et comment tout faire tourner
3. **`FRONTEND_V1.md`** — si tu codes le front
4. **`GlobalDoc.md`** — si tu veux le contexte vision / phases futures

---

## Périmètre V1 vs vision

| | V1 (docs opérationnelles) | Vision long terme |
|---|---------------------------|-------------------|
| Docs | `V1_HANDOFF.md`, `FRONTEND_V1.md` | `GlobalDoc.md` |
| Paiement | Stripe EUR + Connect | Crypto direct |
| Blockchain | Mint reçu NFT après paiement fiat | Billetterie, marketplace, QR |
| Auth | Email / mot de passe + JWT | Wallet (Privy, etc.) |

En cas de doute sur ce qui est **à faire maintenant**, se fier à `V1_HANDOFF.md` et `FRONTEND_V1.md`.

---

## Branche et état actuel

- Branche de travail : **`feature/backend`**
- Backend NestJS, contrats Foundry, flux don → Stripe → mint NFT validé en local (Anvil)
- API front-ready : `GET /associations`, `GET /admin/associations`, CORS configuré
- Frontend : à développer (spec dans `FRONTEND_V1.md`)
