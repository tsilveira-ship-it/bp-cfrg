# BP CFRG — Business Plan Dashboard

Tableau de bord interactif du business plan CrossFit Rive Gauche (Sept 2025 → Août 2030).

## Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript** + **Tailwind v4** + **shadcn/ui**
- **Recharts** pour les graphiques
- **Zustand** pour l'état (persisté en localStorage)

## Pages

- `/` — Dashboard (KPIs FY29, EBITDA, trésorerie min, break-even)
- `/revenue` — Détail recettes par tier d'abonnement + capacité
- `/costs` — Décomposition charges OPEX
- `/cashflow` — Flux de trésorerie consolidé
- `/monthly` — Vue mensuelle 60 mois
- `/parameters` — Édition complète de tous les inputs (tarifs, mix, salaires, loyer, financement, fiscalité…)
- `/audit` — 10 findings sur le BP source + comparatif Base vs Audit corrigé

## Modèle

Tout le modèle financier est dans `lib/model/`:

- `types.ts` — schémas
- `defaults.ts` — paramètres par défaut (reproduisant `Prévi_gestion - v260505.xlsx`) + version « audit corrigé »
- `compute.ts` — moteur de calcul pur (TS, recalcul live à chaque changement de paramètre)

## Scénarios

- **Base (xlsx)** — reproduction fidèle du fichier source
- **Audit corrigé** — IS, D&A, BFR, indexation salaires/tarifs, marketing % CA
- **Personnalisé** — toute modification dans `/parameters` bascule en custom

## Dev

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Déploiement

Déployé sur Vercel.
