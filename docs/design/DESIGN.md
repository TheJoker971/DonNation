# DonNation — Direction artistique V1

Référence visuelle pour le frontend. Maquettes dans ce dossier.

## Maquettes

| Écran | Fichier |
|-------|---------|
| Landing | [`donnation-landing-mockup.png`](./donnation-landing-mockup.png) |
| Auth (login / inscription) | [`donnation-auth-mockup.png`](./donnation-auth-mockup.png) |
| Catalogue associations | [`donnation-catalog-mockup.png`](./donnation-catalog-mockup.png) |
| Don + confirmation | [`donnation-donation-mockup.png`](./donnation-donation-mockup.png) |
| Historique donateur | [`donnation-history-mockup.png`](./donnation-history-mockup.png) |
| Dashboard association | [`donnation-association-dashboard-mockup.png`](./donnation-association-dashboard-mockup.png) |
| Dashboard admin | [`donnation-admin-dashboard-mockup.png`](./donnation-admin-dashboard-mockup.png) |

---

## Identité

**Ton :** confiance, transparence, chaleur humaine — pas « crypto bro », pas « ONG années 2000 ».

**Positionnement visuel :** fintech moderne au service du don associatif. Clean, aéré, rassurant.

---

## Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#059669` | CTA, liens actifs, badges positifs |
| `primary-hover` | `#047857` | Hover boutons |
| `primary-light` | `#D1FAE5` | Fonds badges, highlights |
| `accent` | `#0EA5E9` | Accents secondaires (blockchain, info) |
| `background` | `#FAFAF9` | Fond page (stone-50) |
| `surface` | `#FFFFFF` | Cartes, modales |
| `text` | `#1C1917` | Titres (stone-900) |
| `text-muted` | `#78716C` | Corps secondaire (stone-500) |
| `border` | `#E7E5E4` | Bordures (stone-200) |
| `success` | `#16A34A` | Confirmation, check |
| `warning` | `#F59E0B` | En attente (asso pending) |

---

## Typographie

- **Police :** [Inter](https://fonts.google.com/specimen/Inter) (ou Geist Sans)
- **Titres :** `font-semibold` / `font-bold`, tracking serré
- **Corps :** `text-base` (16px), `leading-relaxed`
- **Hiérarchie :**
  - H1 hero : `text-4xl` → `text-5xl` desktop
  - H2 page : `text-2xl` → `text-3xl`
  - Cartes : `text-lg font-semibold`

---

## Composants clés

### Boutons
- **Primary :** fond `primary`, texte blanc, `rounded-xl`, padding généreux, ombre légère
- **Secondary :** bordure `border`, fond transparent
- **Ghost :** texte `primary`, pas de bordure

### Cartes association
- Fond blanc, `rounded-2xl`, `shadow-sm` → `shadow-md` au hover
- Badge vert « Prête à recevoir des dons » si `stripeOnboardingComplete`
- Badge gris « En cours de configuration » sinon

### Montants don (chips)
- Pills : `10€` `25€` `50€` `100€` + champ libre
- Sélectionné : bordure + fond `primary-light`

### Reçu NFT (succès)
- Carte dédiée avec icône certificat
- `tokenId`, hash tronqué, badge « Certifié on-chain »
- Pas de jargon Web3 agressif — parler « reçu certifié »

---

## Layout

- **Max width contenu :** `max-w-6xl` (1152px)
- **Padding page :** `px-4` mobile, `px-8` desktop
- **Grille assos :** 1 col mobile, 2 cols tablette, 3 cols desktop
- **Espacement :** généreux — la respiration = confiance

---

## Pages V1 (rappel)

| Route | Référence maquette |
|-------|-------------------|
| `/` | Landing |
| `/login`, `/register` | Auth |
| `/associations` | Catalogue |
| `/associations/[slug]/donate` | Don (partie gauche) |
| `/donations` | Historique donateur |
| `/donations/[id]` (succès) | Confirmation + reçu |
| `/association` | Dashboard association |
| `/admin` | Dashboard admin |

Dashboard asso et admin : même DA (fond clair, cartes blanches, vert primary) — à décliner.

---

## Tailwind (extrait `tailwind.config`)

```js
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: '#059669',
        hover: '#047857',
        light: '#D1FAE5',
      },
    },
    borderRadius: {
      xl: '12px',
      '2xl': '16px',
    },
  },
},
```

---

## À éviter

- Dégradés violets « crypto »
- Trop d'icônes blockchain visibles
- Interfaces surchargées
- Photos stock génériques en hero (préférer illustration abstraite ou formes douces)
