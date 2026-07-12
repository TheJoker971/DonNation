# Authentification DonNation

## Donateurs

### Email + mot de passe

Inscription classique (`POST /auth/register`) — pas de flux « mot de passe oublié » en V2 polish.

### WalletConnect (MetaMask, mobile, etc.)

Composant frontend : `WalletConnectButton` sur `/login`.

1. Modal WalletConnect (project ID Reown/WalletConnect).
2. `POST /auth/wallet/nonce` avec `{ address }` — message SIWE light à signer.
3. Signature via `personal_sign` dans le wallet connecté.
4. `POST /auth/wallet/verify` avec `{ address, signature }` → JWT.

Variable frontend :

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=55d5b803894a033448da94ee51cc007e
```

Pour un donateur déjà connecté par email : `PATCH /users/me/wallet` (lien d’adresse).

**Recovery :** pas de mot de passe DonNation — accès via le wallet.

## Associations & administrateurs

### Email + mot de passe

Connexion : `/login?role=association` ou compte admin sur `/login`.

### Mot de passe oublié

- `POST /auth/forgot-password` — répond toujours 200 (anti-énumération).
- Email envoyé **uniquement** si le compte existe, a un `passwordHash`, et `role IN (ASSOCIATION, ADMIN)`.
- Lien : `/reset-password?token=...` (validité 1 h).
- `POST /auth/reset-password` avec `{ token, password }`.

Pages frontend : `/forgot-password`, `/reset-password`.

Email via **Resend** (`RESEND_API_KEY`) ou **SMTP** (`SMTP_HOST`, etc.).

## Endpoints récap

| Méthode | Route | Rôle |
|---------|-------|------|
| POST | `/auth/login` | Tous (email) |
| POST | `/auth/wallet/nonce` | Donateur |
| POST | `/auth/wallet/verify` | Donateur |
| POST | `/auth/forgot-password` | Asso / Admin |
| POST | `/auth/reset-password` | Asso / Admin |
| PATCH | `/users/me/wallet` | Donateur (JWT) |

## Soutenance — points clés

- WalletConnect n’a **pas** de reset mot de passe DonNation (by design).
- Le project ID WalletConnect doit autoriser `http://localhost:3000` dans le dashboard Reown.
