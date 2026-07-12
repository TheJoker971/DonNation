# DonNation — Checklist polish (Priorité A)

Suivi des améliorations UX / parcours utilisateur pour la soutenance.

## Légende

- [x] Terminé
- [ ] À faire (Priorité B)

---

## Backend API

- [x] `GET /associations/:slug` — profil public + stats + derniers supporters
- [x] Stats agrégées dans `GET /associations` (catalogue)
- [x] `GET /donations/me/stats` — total donné, points, niveau, nb assos
- [x] Utilitaire niveaux donateur (Bronze → Platinum)
- [x] Tests unitaires + e2e profil public

---

## Parcours donateur

- [x] Page profil association `/associations/[slug]` (hero, mission, stats, CTA, transparence)
- [x] Catalogue + landing : cartes enrichies → lien profil + stats
- [x] Historique `/donations` : bandeau stats + cartes riches + niveau
- [x] Détail don `/donations/[id]` : reçu PDF, certificat on-chain, points, explorer
- [x] Page don : fil d'Ariane retour profil asso + fetch profil dédié

---

## Composants réutilisables

- [x] `AssociationCard` — carte catalogue uniforme
- [x] `DonorLevelBadge` — Bronze / Silver / Gold / Platinum
- [x] `formatEur` / `formatEurDetailed` / `truncateHash`
- [x] `getTxExplorerUrl` — lien Base Sepolia

---

## Polish global

- [x] Landing : copy pro, parcours 3 étapes mis à jour (sans emojis)
- [x] Copy « reçu certifié on-chain » (pas jargon NFT agressif)
- [ ] Header : améliorations mineures (optionnel)

---

## Parcours utilisateurs (schéma complet)

```
Visiteur
  → Landing / Catalogue
  → Profil association (/associations/[slug])
  → Don (/associations/[slug]/donate) — login requis
  → Paiement Stripe
  → Détail don + PDF + preuve on-chain

Donateur connecté
  → Mes dons (/donations) — stats + niveau + historique
  → Détail don (/donations/[id])

Association
  → Dashboard + dons reçus + Stripe (inchangé)

Admin
  → Validation assos (inchangé)
```

---

## Hors scope (Priorité B — plus tard)

- [ ] Wallet connect au moment du don
- [ ] Campagnes / objectifs de collecte
- [ ] Profil public donateur
- [ ] USDC Stripe (compte US)
- [ ] Galerie photos asso (upload multi-images)
