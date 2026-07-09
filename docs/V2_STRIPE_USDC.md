# Phase 2.1 — Paiements USDC via Stripe Stablecoin Payments

DonNation accepte les dons en **carte (EUR)** et en **USDC** via [Stripe Stablecoin Payments](https://docs.stripe.com/payments/stablecoin-payments). Le donateur paie depuis son wallet crypto (MetaMask, Phantom, etc.) sur `crypto.stripe.com` ; Stripe convertit et règle en **EUR** sur le compte Connect de l’association. **Aucun wallet n’est géré par DonNation.**

> **Pour l’association** : rien à configurer de plus. L’option crypto est une facilité pour le **donateur** ; le virement vers le compte Connect reste toujours en **euros**, comme pour un paiement carte.

---

## Architecture

```
Donateur                    Plateforme DonNation              Association
   │                              │                                │
   ├─ Carte EUR ──► PaymentIntent ──► transfer_data.destination ──► Compte Connect
   │                              │
   └─ USDC (crypto) ──► Stripe crypto.stripe.com ──► même webhook ──► EUR sur Connect
```

- **Capability Connect** : `crypto_payments` demandée **automatiquement** par DonNation à la création du compte Express, à l’onboarding et avant chaque paiement — l’asso n’a aucune action à faire.
- **PaymentIntent** : `payment_method_types: ['card', 'crypto']`, devise `eur`.
- **Webhook** : `payment_intent.succeeded` — identique carte / USDC → PAID → mint NFT → reçu PDF.

---

## Prérequis Stripe Dashboard (plateforme DonNation uniquement)

1. **Compte plateforme** (France) : activer **Stablecoin payments** une fois dans [Payment methods](https://dashboard.stripe.com/settings/payment_methods).
2. **Mode test** : vérifier que l’option Crypto apparaît ; sinon contacter Stripe (preview EU possible).
3. DonNation demande ensuite `crypto_payments` sur chaque compte Connect asso via l’API — Stripe active la capability côté serveur (statut `active` / `pending` selon le compte).

---

## Configuration

### Backend `.env`

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CRYPTO_PAYMENTS_ENABLED=true   # false = carte uniquement (fallback)
APP_URL=http://localhost:3000
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

---

## Fichiers modifiés (Phase 2.1)

| Fichier | Rôle |
|---------|------|
| `backend/src/modules/payments/stripe.service.ts` | Capability `crypto_payments`, PI `card`+`crypto`, fallback carte |
| `backend/prisma/schema.prisma` | `stripeCryptoPaymentsActive` sur `Association` |
| `frontend/src/components/CheckoutForm.tsx` | Payment Element onglets + texte USDC |
| `frontend/src/app/associations/[slug]/donate/page.tsx` | Affichage carte / USDC |
| `frontend/src/app/association/page.tsx` | Statut USDC asso |

---

## Checklist test manuel

### 1. Dashboard Stripe

- [ ] Stablecoin payments activé sur le compte plateforme
- [ ] `stripe listen --forward-to localhost:3001/api/v1/payments/stripe/webhook` en cours

### 2. Association

- [ ] Compte asso APPROVED + onboarding Stripe complet (comme pour la carte)
- [ ] Aucune config USDC côté asso — les dons arrivent en EUR dans tous les cas

### 3. Don carte (régression)

- [ ] Créer un don → Payment Element → carte `4242...`
- [ ] Webhook `payment_intent.succeeded` → statut PAID → COMPLETED + PDF

### 4. Don USDC

- [ ] Créer un don → onglet Crypto / USDC dans Payment Element
- [ ] Redirection `crypto.stripe.com` → wallet test → paiement
- [ ] Retour site → même flux PAID → mint → reçu
- [ ] Logs backend : `paid via USDC (crypto)`

### 5. Fallback

- [ ] `STRIPE_CRYPTO_PAYMENTS_ENABLED=false` → uniquement carte, pas d’erreur

---

## Limites connues (Stripe)

- Règlement en **devise locale** (EUR pour FR), pas en USDC côté asso.
- Plafond client : **10 000 USD** par transaction.
- Pas de chargebacks ; remboursements en stablecoin vers le wallet d’origine.
- Disponibilité **preview** selon pays / compte Stripe — en dev, l’option Crypto peut être absente jusqu’à activation Dashboard.

---

## Dépannage

| Symptôme | Action |
|----------|--------|
| Pas d’onglet Crypto dans Payment Element | Activer Stablecoin dans Dashboard ; vérifier `STRIPE_CRYPTO_PAYMENTS_ENABLED` ; capability `crypto_payments` active sur le compte Connect |
| Erreur à la création du PI avec `crypto` | Normal si non activé — le backend retombe sur `card` seul (voir logs) |
| Webhook non reçu | Vérifier `STRIPE_WEBHOOK_SECRET` complet + `stripe listen` |
| `stripeCryptoPaymentsActive` reste false | Attendre `account.updated` ou re-demander onboarding |

---

## Prochaines étapes (hors 2.1)

- Afficher le mode de paiement (carte / USDC) sur le reçu et l’historique donateur
- Tests e2e mockés Stripe avec `payment_method_types: ['crypto']`
- Production : validation Stripe de la capability crypto pour comptes FR Connect
