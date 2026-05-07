# Audit global BP CFRG + Plan investor-ready

> Date : 2026-05-07
> Contexte : audit complet après refactor cohort model (6 niveaux) + capacity-planner enrichi (3 bundles) + pages pitch (team, funnel, USP).
> Objectif : identifier ce qui manque pour convaincre investisseurs.

---

## 1. Inventaire 40 routes existantes

### 1.1. Pilotage / Vue d'ensemble (5 routes)
- `/` Dashboard hub avec IntentionHub + 6 raccourcis actions
- `/pnl` Compte de résultat 7 ans + collapse lignes
- `/cashflow` Tableau flux + chart trésorerie cumulée
- `/balance-sheet` Bilan annuel équilibré
- `/monthly` Vue mensuelle 84 mois sticky table
- `/plan-quinzaines` Plan an1 quinzaines (tréso fine)

### 1.2. Modélisation (6 routes)
- `/parameters` Tous inputs avec accordion sections + validation 4-eyes
- `/revenue` Tier breakdown TTC/HT + capacité hours/membre
- `/costs` Onglets monthly/yearly stacked bar
- `/salaries` 5 onglets (cadres / freelance / charges / estimateur / évolution)
- `/capacity-planner` Plan visuel espaces × planning × allocation × heatmap saturation × personas × disciplines × marginal economics ⭐ **enrichi B1/B2/B3**
- `/financing` Apports + emprunts + obligations + simulateur bond + échéancier

### 1.3. Diagnostic (4 routes)
- `/audit-pack` Rapport audit
- `/health-check` Diagnostic 360°
- `/cross-checks` Validations transversales
- `/audit` Audit & risques (10 findings)

### 1.4. Sensibilité (4 routes)
- `/sensitivity` Sliders ±20% + presets
- `/monte-carlo` 1000+ simulations distribution IRR/EBITDA
- `/waterfalls` Décomposition CA / EBITDA
- `/variance` Réel vs prévu (post-exploitation)

### 1.5. Pitch & partage (8 routes)
- `/executive-summary` Résumé 1-page
- `/financial-highlights` Synthèse financière 1-page
- `/team` ⭐ Bios 8 coachs + gouvernance
- `/funnel` ⭐ Dashboard CRM funnel acquisition (350 prospects)
- `/use-of-funds` Sankey emplois/ressources
- `/cap-table` Actionnariat + dilutions
- `/share` Partager (lien investisseur read-only) — **à finaliser**
- `/full-bp` BP complet PDF

### 1.6. Scénarios (2 routes)
- `/assumptions` Hypothèses listées + justifications + liens édition
- `/scenarios` Master + Forks + comparer + auto-save

### 1.7. Outils avancés (9 routes)
- `/investor` (legacy) IRR + multiple + NPV + payback + DSCR + LTV/CAC ventilée par tier
- `/capacity` (vue rapide) — redondance partielle avec `/capacity-planner` (cf §6.1)
- `/audit-log` Journal modifications
- `/qa` Q&A par champ
- `/comparables` Benchmark sectoriel fitness Paris
- `/glossary` Glossaire investisseur 50+ termes
- `/master-history` Timeline versions Master publiées
- `/data-room` Espace documentaire upload Supabase Storage
- `/backup` Export/import JSON scénario

### 1.8. Admin (1 route)
- `/admin` Gestion accès (admin only)

---

## 2. Forces de l'app (état actuel)

### 2.1. Modélisation financière complète
- ✅ 7 ans horizon paramétrable (FY26 → FY32)
- ✅ Cohort model 6 niveaux (acquisitions × rétention × tier × curve × legacy multi-cohortes × bilan funnel × mix évolutif × canaux × pause)
- ✅ Bilan équilibré (Actif = Passif)
- ✅ TVA mensuelle + IS quarterly + déficits reportables
- ✅ Capacity planner data-driven (heatmap × parallel × personas × disciplines × marginal economics)
- ✅ Validation 4-eyes par champ + flag « à revoir »
- ✅ Auto-save Supabase fork + scénarios Master + history

### 2.2. Pitch readiness
- ✅ USP différenciants documentés (8 points) sur `/investor`
- ✅ Bios équipe 8 coachs certifiés (`/team`)
- ✅ Funnel CRM live data (`/funnel` — 350 prospects, 135 customers, 33 abos actifs)
- ✅ Pitch content pack 12 sections mappant site web → pages investor (`docs/PITCH-CONTENT-PACK.md`)
- ✅ Affiliation CrossFit HQ + Hyrox documentée
- ✅ Track record 5+ ans exploitation pré-CFRG

### 2.3. Robustesse
- ✅ Type-safe TypeScript strict
- ✅ tsc --noEmit exit 0 sur main
- ✅ Vercel deploy automatique avec rollback 1-clic
- ✅ Compat ascendante : tous champs nouveaux optionnels

---

## 3. Gaps identifiés — ce qu'il manque

### 3.1. Dossier banque / officiel — ⚠️ CRITIQUE
Le BP est solide pour pitch equity mais incomplet pour dossier bancaire :
- ❌ **Notation BCE / éligibilité PGE** — pas de scoring auto
- ❌ **Caution personnelle + garanties** — paramètre absent
- ❌ **Plan financement détaillé an1 par quinzaine** — `/plan-quinzaines` existe mais pas connecté au plan détaillé bancaire
- ❌ **Aide JEI / CIR / crédit apprentissage** — non modélisés
- ❌ **Provisions IS trimestrielles fines** — partiellement (acomptes mars/juin/sept/déc + solde mai N+1)
- ❌ **BFR détaillé par composant** — daysReceivables / daysSupplierPayables / daysStock partiellement seulement

### 3.2. Données réelles dashboard CRM — ⚠️ HAUTE
Tout est manuel. Boutons « Importer dashboard CRM » présents mais GRISÉS V2 :
- ❌ **Import heatmap fréquentation** depuis `crm.sessions` (90j)
- ❌ **Import courbe rétention Javelot/ResaWod** depuis `crm.sessions` cohorted
- ❌ **Import funnel Bilan → conversion** depuis `crm.payments` + `crm.customers`
- ❌ **Import canaux acquisition** depuis `crm.prospects.first_source`
- ❌ **Sync séances par ancienneté** depuis `crm.sessions` × `crm.customers.created_at`
- ❌ **Sync churn réel** depuis `crm.customers` membership_end vs membership_start

→ La calibration empirique est documentée mais pas branchée. Investisseur sophistiqué demandera : « Vos chiffres sont-ils calibrés sur du réel ? »

### 3.3. Étude de marché — ⚠️ MOYENNE
- ❌ `/market` route prévue ROADMAP mais **pas encore créée**
  - TAM (fitness France) / SAM (CrossFit Paris) / SOM (CFRG zone)
  - Tendances secteur 5 ans (CAGR)
  - Personas avec données chiffrées
  - Carte concurrence Paris
- ❌ `/strategy` Business Model Canvas
- ❌ `/risks` Matrice impact × probabilité 5×5
- ❌ `/swot` SWOT structuré
- ❌ `/exit-strategy` Sortie investisseurs
- ❌ `/customer-validation` Pré-inscriptions + NPS + témoignages

### 3.4. Sécurité & gouvernance partage
- ⚠️ **Vue investisseur read-only avec watermark** prévue ROADMAP — `/share` route existe mais à finaliser
- ❌ Token signé révocable par investisseur
- ❌ Logs accès « qui a vu quoi » sur `/data-room`
- ❌ Watermark dynamique avec nom investisseur

### 3.5. Tests automatisés
- ❌ Vitest setup partiel (cf imports vitest existent)
- ❌ Tests unitaires `compute.ts` (cas xlsx connus)
- ❌ Snapshot tests UI critiques
- ❌ CI GitHub Actions

### 3.6. Pitch deck visuel
- ❌ **Pitch deck PNG/PDF 1-page exportable** ROADMAP #14 — pas encore livré
- ❌ Vercel OG image dynamique pour partage
- ❌ Brochure A4 5-slides existe en JS pptxgenjs côté `crossfitrg-web/docs/decks/build-brochure-cfrg.js` mais pas connectée au BP

### 3.7. UX detail
- ⚠️ `/capacity` (legacy) redondance avec `/capacity-planner` enrichi
- ❌ Recherche globale Cmd+K déjà partiellement (38 pages indexées)
- ❌ Notes par champ (cell-level annotations)

---

## 4. Évaluation niveau investisseur

### 4.1. Note actuelle par axe (sur 10)

| Axe | Note | Commentaire |
|---|---|---|
| Modélisation financière | 9/10 | Très complet. 6 niveaux cohort, capacity 3 bundles |
| Pitch équipe | 8/10 | Bios + JSON-LD. Manque advisors/board |
| Pitch produit | 7/10 | USP + funnel CRM. Manque pitch deck visuel exportable |
| Étude de marché | 4/10 | TAM/SAM/SOM absents. Comparables existent partiellement |
| Stratégie | 5/10 | Pricing OK, BMC absent, exit-strategy absent |
| Risques | 6/10 | `/audit` couvre opérationnel. Matrice 5×5 absente |
| Données réelles | 5/10 | Dashboard CRM live mais imports tous grisés |
| Dossier bancaire | 5/10 | DSCR + bilan OK. PGE + caution + JEI absents |
| Robustesse code | 7/10 | TS strict + Vercel CI. Tests unitaires absents |
| Partage sécurisé | 6/10 | Auth Supabase + RLS. Watermark + token signé absents |

**Note globale : 6.2/10** — bon pour pitch interne / business angels, **insuffisant pour VC institutionnel ou banque**.

### 4.2. Comparaison segments investisseurs

| Cible | Niveau requis | App actuelle | Gap critique |
|---|---|---|---|
| Love money / FFF | 5/10 | 6.2 ✅ | OK |
| Business angels | 6/10 | 6.2 ✅ | OK marginal |
| BPI / banque | 7/10 | 6.2 ❌ | Dossier bancaire manquant |
| VC seed | 7.5/10 | 6.2 ❌ | Étude marché + données réelles |
| VC série A | 8.5/10 | 6.2 ❌ | Tout sauf modélisation |

---

## 5. Plan d'action priorisé pour investor-ready

### Sprint 1 (1 semaine) — Calibration data réelle
Objectif : crédibilité « chiffres calibrés sur historique réel ».

1. **Endpoint API CRM read-only** dans `crossfitrg-web` :
   - `GET /api/crm/heatmap?since=90d` → matrix 7×14
   - `GET /api/crm/cohort-retention?cohort=2024Q1` → array survivors
   - `GET /api/crm/funnel-bilan?since=180d` → { bilans, conversions, channels }
   - Auth : Bearer token partagé entre BP et CRM

2. **Implémenter import buttons** (actuellement grisés) :
   - Capacity-planner : « Importer heatmap CRM »
   - Subs-editor : « Importer Javelot/ResaWod » (retention curve)
   - Bilan funnel : « Importer trajectoire dashboard CRM »
   - Canaux acquisition : « Preset depuis CRM réel »

3. **Calibration auto au load** : si scénario Master a `useRealData: true`, refresh chiffres au chargement.

### Sprint 2 (1 semaine) — Étude de marché
Objectif : compléter contextualisation business.

4. **`/market`** :
   - 3 cercles TAM/SAM/SOM avec sources (Xerfi, INSEE, FFGym, IHRSA)
   - Carte interactive Paris avec 10 concurrents (Reebok, Train Yard, Louvre, Belleville…) + prix + reviews Google
   - Tendances secteur 5 ans (CAGR fitness France)
   - 5 personas avec photos + métriques

5. **`/strategy`** Business Model Canvas 9 blocs

6. **`/swot`** matrice 4 cadrans + plans action SO/ST/WO/WT

7. **`/risks`** matrice 5×5 impact × probabilité + mitigation par risque

8. **`/exit-strategy`** :
   - 3 options (LBO interne / cession groupe fitness / franchise multi-sites)
   - Multiples sectoriels
   - Valorisation projetée scénarios

### Sprint 3 (1 semaine) — Dossier bancaire
Objectif : éligibilité PGE / prêt bancaire.

9. **Notation BCE simplifiée** : ratio fonds propres / total bilan, DSCR, ICR, gearing

10. **Caution personnelle + nantissement** :
    - Param `personalGuarantee: number`
    - Modélisation BPI / OSEO (50-80% garantie)

11. **JEI / CIR / Crédit apprentissage** : modélisation crédits d'impôt avec éligibilité.

12. **Provisions IS trimestrielles fines** : acomptes mars/juin/sept/déc + solde mai N+1.

13. **BFR détaillé** : créances 3j (Square) + dettes fournisseurs 30j + stock 0.

### Sprint 4 (1 semaine) — Pitch deck visuel + partage sécurisé
Objectif : matériel commercial commercial-ready.

14. **Pitch deck PNG/PDF 1-page** :
    - Template exportable html2canvas ou Vercel OG image
    - 8 KPI + 2 graphes + tagline + USP + équipe
    - Brand CFRG strict

15. **Vue investisseur read-only** :
    - Route `/investor-view/[token]`
    - Token signé révocable côté Supabase
    - Watermark « Confidentiel — {nom investisseur} »
    - Sidebar simplifiée
    - Désactivation édition + auto-save

16. **`/data-room` enrichi** :
    - Logs accès qui-a-vu-quoi
    - Permissions par investisseur (read-only, watermark dynamique)

17. **Brochure auto-générée** : importer le pptxgenjs depuis `crossfitrg-web/docs/decks/build-brochure-cfrg.js` avec data live BP.

### Sprint 5 (3-5 jours) — Robustesse
18. **Vitest setup complet** :
    - Tests `compute.ts` (cas xlsx connus)
    - Tests `capacity-planner.ts` (auto-schedule, marginal econ)
    - Snapshot UI critiques (`/investor`, `/financial-highlights`)

19. **CI GitHub Actions** : lint + type-check + tests sur PR

20. **`/customer-validation`** : témoignages + NPS + reviews Google curated.

### Sprint 6 (continu) — Polish UX
21. **Refonte `/capacity` legacy** en dashboard synthèse consommant `/capacity-planner` (cf §6.1)

22. **Cmd+K palette enrichie** avec nouvelles routes

23. **Recherche globale dans assumptions/notes**

24. **Notes cell-level annotations** sur tous champs

---

## 6. Annexes

### 6.1. Refonte `/capacity` (legacy)

URL `bp-cfrg.vercel.app/capacity` actuellement = vue agrégée (1 saturation globale + simulateur « et si »).

**Reco** : transformer en **dashboard synthèse** :
- Header KPIs : saturation moyenne + max par FY (lu de la heatmap)
- Card reco engine global multi-FY
- Couverture personas : « Mix actuel : 55% CSP+ ✅ / 10% Hyrox ⚠️ pas assez créneau pic »
- Couverture disciplines : « 80% créneaux taggés / 20% non assignés »
- Bouton « Modifier » → redirige `/capacity-planner`
- Préserve URL bookmark existant

### 6.2. Stack technique

```
Frontend : Next.js 16 + App Router + Turbopack + React 19
UI       : Tailwind v4 + shadcn/base-ui + Recharts
State    : Zustand persist (local) + auto-save Supabase fork
Auth     : Supabase Auth Google + RLS
Deploy   : Vercel auto-deploy main → bp-cfrg.vercel.app
Repo     : github.com/tsilveira-ship-it/bp-cfrg
```

### 6.3. Roadmap recap

| Phase | État |
|---|---|
| Phase 0 (UX critique) | ✅ Done — collapse PNL |
| Phase 1 (sprint 1) | ⚠️ Partiel — vue investisseur read-only à finir |
| Phase 2 (sprint 2) | ⚠️ Partiel — déficits OK, BFR partiel, plan quinzaines existe |
| Phase 3 (sprint 3) | ✅ Done — Monte Carlo, multi-scénarios, waterfalls |
| Phase 4 (sprint 4) | ⚠️ Pitch deck PNG manquant |
| Phase 5 (sprint 5) | ❌ Étude marché absente |
| Phase 6 (sprint 6) | ⚠️ /risks /swot /exit-strategy /customer-validation absents |

---

## 7. Verdict

**État actuel** : ~6.2/10 — Pitch interne et business angels OK. **Pas suffisant pour BPI/banque/VC institutionnel.**

**Pour passer à 8/10 (investor-ready)** : exécuter sprints 1-4 (4 semaines).

**Pour passer à 9/10 (institutionnel)** : sprints 1-6 (6 semaines).

**Quick wins à faire en premier** (ordre) :
1. Sprint 1 (data réelle) — débloque crédibilité
2. Sprint 4 (pitch deck PNG + partage sécurisé) — outils commerciaux
3. Sprint 2 (étude marché) — contexte business
4. Sprint 3 (dossier bancaire) — si BPI sur le radar

---

## 8. Annexe — Récents changements committés

| Commit | Contenu |
|---|---|
| `f2dbb96` | Capacity B3 — personas + disciplines + no-show + marginal econ |
| `8e0966c` | Capacity B2 — planning hétérogène + auto-schedule + sessions par ancienneté |
| `39dd599` | Capacity B1 — heatmap saturation + reco engine + auto-scale 70/80% |
| `f0f3bf2` | Subs editor — cumul legacy+new + désactiver growth si cohort actif |
| `a357a7e` | Subs editor — trajectoire réelle issue de computeModel |
| `967b1ed` | Churn L6 — mix évolutif + canaux + saisonnalité diff + pause |
| `7b4f675` | Churn L5 — funnel Bilan → conversion |
| `a0c7e21` | Churn L4 — legacy multi-cohortes + migration |
| `a001f86` | Churn L3 — courbe rétention non-exp |
| `05426b0` | Churn L2 — churn par tier + LTV ventilée |
| `187c6a1` | Churn L1 — cohort model + fix double-counting |
| `e372510` | Pitch content pack 12 sections |
| `0e48f7e` | Pages /team + /funnel + UspBlock |
