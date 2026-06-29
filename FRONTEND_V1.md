# DonNation — Spec frontend V1

Guide pour développer le frontend MVP. Le backend est prêt sur la branche `feature/backend`.

**Lire aussi :** [`V1_HANDOFF.md`](./V1_HANDOFF.md) (setup backend, Stripe, Anvil, tests curl, pièges).

---

## 1. Objectif V1

Interface web pour enchaîner **sans curl** le flux déjà validé côté API :

```text
Inscription → Login → (Admin approuve asso) → Asso connecte Stripe
→ Donateur fait un don → Paiement carte → NFT minté → Confirmation
```

### Hors scope V1 front
- Wallet Web3 / MetaMask / Privy
- Affichage metadata IPFS (`metadataUrl` est `null`)
- Marketplace, billetterie, QR code
- Refresh token JWT
- i18n multi-langues (français suffit pour V1)

---

## 2. Stack recommandée

| Techno | Choix |
|--------|-------|
| Framework | **Next.js 14+** (App Router) |
| Langage | TypeScript |
| Styles | Tailwind CSS |
| Paiement | **@stripe/stripe-js** + **@stripe/react-stripe-js** |
| HTTP | `fetch` ou axios |
| State auth | Context React + `localStorage` (ou cookie httpOnly si tu préfères) |

Structure suggérée :

```
frontend/
├── .env.local
├── src/
│   ├── app/                    # Routes Next.js App Router
│   ├── components/
│   ├── lib/
│   │   ├── api.ts              # Client API + header Authorization
│   │   └── auth.ts             # Stockage JWT, guards
│   └── types/                  # Types alignés sur réponses API
└── package.json
```

Le dossier `frontend/` n'existe pas encore — à créer à la racine du monorepo.

---

## 3. Variables d'environnement front

Créer `frontend/.env.local` :

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | Backend local (`api/v1`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Dashboard Stripe → API keys (mode **Test**) |

Ne jamais mettre `sk_test_` ou `whsec_` dans le front.

---

## 4. Authentification

### Login / register

```http
POST /auth/login
Body: { "email": "...", "password": "..." }

Response 200:
{
  "accessToken": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "...",
    "role": "DONOR" | "ASSOCIATION" | "ADMIN",
    "displayName": "...",
    "walletAddress": null,
    "createdAt": "..."
  }
}
```

```http
POST /auth/register
Body: { "email", "password" (min 8), "displayName?" }
→ Même format de réponse (rôle DONOR)
```

```http
POST /auth/register/association
Body: {
  "email", "password",
  "name": "Croix Rouge Paris",
  "slug": "croix-rouge-paris",   // lowercase, tirets uniquement
  "description?": "..."
}
→ { "accessToken", "user", "association": { ... } }
```

### Utiliser le JWT

Toutes les routes protégées :

```http
Authorization: Bearer <accessToken>
```

### Profil courant

```http
GET /auth/me
Authorization: Bearer ...
```

### Redirection après login (suggestion)

| `user.role` | Redirect |
|-------------|----------|
| `ADMIN` | `/admin` |
| `ASSOCIATION` | `/association` |
| `DONOR` | `/donations` ou `/` |

### Expiration

`JWT_EXPIRES_IN=1h` dans le backend. Sur `401`, rediriger vers `/login`.

---

## 5. Pages et routes

### Public

| Route | Description |
|-------|-------------|
| `/` | Landing simple + CTA « Faire un don » / « Espace association » |
| `/login` | Formulaire login (tous rôles) |
| `/register` | Inscription **donateur** |
| `/register/association` | Inscription **association** |

### Donateur (`role: DONOR`)

| Route | Description |
|-------|-------------|
| `/associations` | Liste des assos **approuvées** (voir §8 — endpoint à ajouter ou workaround) |
| `/associations/[slug]/donate` | Formulaire montant + paiement Stripe |
| `/donations` | Historique (`GET /donations/me`) |
| `/donations/[id]` | Détail don + statut mint (tokenId, txHash) |

### Association (`role: ASSOCIATION`)

| Route | Description |
|-------|-------------|
| `/association` | Dashboard : profil, statuts, actions |
| `/association/stripe/return` | Page succès après onboarding Stripe |
| `/association/stripe/refresh` | Relance onboarding si lien expiré |

### Admin (`role: ADMIN`)

| Route | Description |
|-------|-------------|
| `/admin` | Liste assos en attente + actions approve/suspend |
| `/admin/associations/[id]` | Détail (optionnel V1) |

---

## 6. Écrans détaillés

### 6.1 Dashboard association (`/association`)

**API :** `GET /associations/me`

Afficher :
- `name`, `slug`, `description`, `status`
- `onChainRegistered` (badge blockchain)
- `stripeConnectAccountId` (présent ou non)
- `stripeOnboardingComplete` (badge « Peut recevoir des dons »)

**Actions :**

| Condition | Bouton | API |
|-----------|--------|-----|
| `!stripeOnboardingComplete` | « Connecter Stripe » | `POST /associations/me/stripe/onboard` → redirect vers `response.url` |
| `status !== APPROVED` | Message « En attente de validation admin » | — |

**Note :** `onChainRegistered` peut être `false` dans la réponse `approve` admin mais `true` dans `/associations/me` — faire confiance à `/associations/me`.

### 6.2 Pages retour Stripe (obligatoires)

Le backend redirige vers :
- `{APP_URL}/association/stripe/return`
- `{APP_URL}/association/stripe/refresh`

Avec le front sur port **3001**, soit :
- lancer Next sur `3000` et backend sur `3001`, **ou**
- changer `APP_URL` backend + routes retour

**Recommandation V1 :** Next.js sur **port 3000**, backend sur **3001** (changer `PORT=3001` dans `backend/.env`).

Pages minimales :

**`/association/stripe/return`**
- Message : « Stripe connecté, votre compte est en cours de vérification »
- Bouton retour dashboard
- Optionnel : polling `GET /associations/me` toutes les 2s jusqu’à `stripeOnboardingComplete: true`

**`/association/stripe/refresh`**
- Message : « Session expirée »
- Bouton « Recommencer » → `POST /associations/me/stripe/onboard`

### 6.3 Admin — approuver une association

```http
PATCH /admin/associations/:id/approve
PATCH /admin/associations/:id/suspend
Authorization: Bearer <admin_token>
```

Pas de `GET /admin/associations` aujourd’hui → voir §8.

### 6.4 Flux don + paiement Stripe

**Prérequis donateur :** connecté (`DONOR`), asso `APPROVED` + `stripeOnboardingComplete: true`.

#### Étape 1 — Créer le don

```http
POST /donations
Authorization: Bearer <donor_token>
Body: {
  "associationId": "uuid",
  "amountEur": 5000,        // centimes ! 5000 = 50,00 €
  "isAnonymous": false
}

Response:
{
  "donation": { "id", "status": "PENDING", ... },
  "invoice": { "id", "status": "PENDING", ... }
}
```

#### Étape 2 — Obtenir le client secret

```http
POST /donations/:id/pay
Authorization: Bearer <donor_token>

Response:
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

#### Étape 3 — Stripe Payment Element (React)

```tsx
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Wrapper
<Elements stripe={stripePromise} options={{ clientSecret }}>
  <CheckoutForm />
</Elements>

// CheckoutForm : stripe.confirmPayment({ elements, confirmParams: { return_url: `${origin}/donations/${id}/success` } })
```

Doc Stripe : [Accept a payment](https://docs.stripe.com/payments/accept-a-payment?platform=web&ui=elements)

#### Étape 4 — Après paiement

Le backend reçoit `payment_intent.succeeded` via webhook (pas le front).

Sur la page succès ou détail :
- Polling `GET /donations/:id` jusqu’à `status === "COMPLETED"`
- Afficher `invoice.tokenId`, `invoice.txHash`, `invoice.chainId`

Exemple réponse finale :

```json
{
  "status": "COMPLETED",
  "amountEur": 5000,
  "invoice": {
    "status": "MINTED",
    "tokenId": 1,
    "txHash": "0x...",
    "chainId": 31337
  }
}
```

### 6.5 Historique donateur

```http
GET /donations/me
Authorization: Bearer <donor_token>
→ Array de donations avec association + invoice
```

---

## 7. Client API (exemple)

```typescript
// lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? res.statusText);
  }

  return res.json();
}
```

---

## 8. Manques backend à prévoir (coordination)

Ces endpoints **n'existent pas encore** — à ajouter côté backend ou contourner en V1 :

| Besoin front | Endpoint suggéré | Workaround V1 |
|--------------|------------------|---------------|
| Admin : liste assos pending | `GET /admin/associations?status=PENDING` | Demander à l'équipe backend de l'ajouter |
| Donateur : choisir une asso | `GET /associations?status=APPROVED` (public) | URL directe `/associations/[slug]/donate` avec UUID en dur pour démo |
| Profil asso enrichi | — | `GET /associations/me` suffit |

**Priorité backend pour le front :** `GET /admin/associations` et `GET /associations` (public, approved only).

---

## 9. Guards / middleware Next.js

Protéger les routes par rôle :

```typescript
// middleware.ts (simplifié)
// Décoder JWT (jwt-decode) pour lire role — pas besoin de vérifier signature côté front
// ADMIN → /admin/*
// ASSOCIATION → /association/*
// DONOR → /donations/*, /associations/*
```

Sur `401` API → clear token + redirect `/login`.

---

## 10. UX minimale V1

Pas de maquettes Figma fournies — viser **fonctionnel et clair** :

- Formulaires simples, messages d'erreur API affichés
- Badges de statut colorés :
  - Asso : `PENDING` orange, `APPROVED` vert, `SUSPENDED` rouge
  - Don : `PENDING` → `PAID` → `COMPLETED`
  - Stripe : `stripeOnboardingComplete` vert/gris
  - Blockchain : `onChainRegistered` + lien explorateur si `txHash` (Anvil : pas d'explorer public ; afficher hash brut)
- Montants : toujours afficher en **euros** (`amountEur / 100`)
- Mobile-first (Tailwind responsive)

---

## 11. Dev local — ports recommandés

Pour que les URLs retour Stripe fonctionnent sans CORS compliqué :

| Service | Port |
|---------|------|
| **Frontend Next.js** | `3000` |
| **Backend NestJS** | `3001` |
| Anvil | `8545` |
| Postgres | `5433` |

Dans `backend/.env` :
```env
PORT=3001
APP_URL=http://localhost:3000
```

Dans `frontend/.env.local` :
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

CORS : si le backend bloque, ajouter une config CORS NestJS (`enableCors({ origin: 'http://localhost:3000' })`) — **à vérifier / ajouter si nécessaire**.

---

## 12. Ordre de développement suggéré

1. **Setup** — Next.js, Tailwind, client API, auth context
2. **Auth** — login, register donateur, register asso
3. **Association dashboard** — `/association` + bouton Stripe onboard
4. **Pages retour Stripe** — return + refresh
5. **Admin** — approve/suspend (avec endpoint liste ou UUID temporaire)
6. **Don** — création + Stripe Payment Element + page succès avec polling
7. **Historique** — `/donations/me` + `/donations/[id]`
8. **Polish** — erreurs, loading states, guards rôle

---

## 13. Tests manuels front

Checklist avant de considérer le front V1 « done » :

- [ ] Inscription donateur + login
- [ ] Inscription association + login
- [ ] Admin approuve l'asso (depuis UI admin)
- [ ] Asso lance onboarding Stripe → revient sur `/association/stripe/return`
- [ ] `stripeOnboardingComplete` passe à `true` (après webhook — `stripe listen` doit tourner)
- [ ] Donateur crée un don 50 € et paie avec carte test `4242 4242 4242 4242`
- [ ] Page détail affiche `COMPLETED` + `tokenId` + `txHash`
- [ ] Déconnexion + routes protégées redirigent vers login

**Backend + Stripe + Anvil** doivent tourner — voir checklist dans `V1_HANDOFF.md` §10.

---

## 14. Comptes de test

| Rôle | Email | Password |
|------|-------|----------|
| Admin | `admin@donnation.local` | `DonNationAdmin123!` |
| Association | `asso@test.com` | `password123` |
| Donateur | `donor@test.com` | `password123` |

---

## 15. Références

| Ressource | Lien / fichier |
|-----------|----------------|
| Handoff backend | [`V1_HANDOFF.md`](./V1_HANDOFF.md) |
| Vision long terme | [`GlobalDoc.md`](./GlobalDoc.md) |
| Schéma DB | `backend/prisma/schema.prisma` |
| Stripe Elements React | https://docs.stripe.com/stripe-js/react |
| Next.js App Router | https://nextjs.org/docs/app |

---

## 16. Questions à trancher avec l'équipe (optionnel)

- Next sur 3000 vs backend sur 3000 ? (recommandation : front 3000, API 3001)
- `localStorage` vs cookie httpOnly pour le JWT ?
- Faut-il ajouter `GET /admin/associations` et `GET /associations` avant de coder l'admin et le catalogue ?
- Design system / charte graphique ou Tailwind brut pour V1 ?
