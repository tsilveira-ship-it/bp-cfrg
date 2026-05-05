# Roadmap BP CFRG

Documentation des éléments restant à construire. À reprendre dans une nouvelle discussion.

## État actuel (déployé)

**Live**: https://bp-cfrg.vercel.app
**GitHub**: https://github.com/tsilveira-ship-it/bp-cfrg

### Pages existantes (sidebar 4 groupes + admin)

**Vue d'ensemble**
- `/` Dashboard avec KPIs FY final + cards par année + 5 graphes + synthèse auto
- `/pnl` Compte de résultat complet (CA détaillé → OPEX → EBITDA → D&A → EBIT → Intérêts → PBT → IS → Net)
- `/cashflow` Tableau de flux annuel + chart trésorerie cumulée
- `/balance-sheet` Bilan annuel + onglet Emplois/Ressources
- `/monthly` Vue mensuelle 60-84 mois (sticky table)

**Détail**
- `/revenue` Tier breakdown TTC/HT + capacité hours/membre
- `/costs` Onglets monthly/yearly avec stacked bar scrollable, table sticky, filtre FY
- `/salaries` Outil dédié (5 onglets): cadres, freelance, charges par catégorie, estimateur net/brut/coût, évolution
- `/financing` Apports + emprunts + obligations + simulateur bond + échéancier consolidé

**Analyse**
- `/investor` IRR equity + multiple + NPV + payback + DSCR + LTV/CAC + retours obligataires
- `/sensitivity` Sliders ±20% + presets pessimist/base/optimist + alertes stress test
- `/capacity` Heures coaching vs membres avec saturation
- `/audit` 10 axes économies actionables + 10 findings + comparaison

**Configuration**
- `/parameters` Tous inputs avec sections groupées (Recettes/Charges/Investissement/Fiscalité)
- `/assumptions` 30+ paramètres listés avec valeurs + justifications + liens édition
- `/scenarios` Master + Forks + comparer + auto-save
- `/master-history` Timeline versions Master publiées
- `/print` Vue A4 export PDF (Ctrl+P)
- `/admin` Gestion accès (admin only)

### Stack technique
- Next.js 16 + App Router + Turbopack
- TypeScript + Tailwind v4 + shadcn/ui (base-ui)
- Recharts pour graphiques
- Zustand persist pour state local + auto-save Supabase fork
- Supabase Auth Google + RLS
- Vercel deploy

### Modèle financier
Modèle complet dans `lib/model/`:
- `types.ts` — schemas + helpers (buildTimeline, monthlyEmployerCost, netToGross, etc.)
- `defaults.ts` — params par défaut (Sept 2026 → 7 ans, FY26-FY32)
- `compute.ts` — moteur compute pure TS

Inputs modulaires:
- Timeline (startYear + horizonYears)
- Subs avec tiers TTC, mix %, ramp-up, growthRates[], saisonnalité 12 mois, churn cohort
- Salaires cadres avec catégorie/13e/primes/avantages + freelance pools (h/jour ouvré×5 + h/weekend×2)
- Loyer monthlyByFy (longueur = horizonYears)
- Recurring + oneOffs + marketing (fixe + % CA)
- CAPEX 4 lignes + amort séparé équipement (5y) / travaux (10y)
- Financing: equity[] + loans[] (amortissable) + bonds[] (BondIssue avec PIK + différé)
- BFR + IS + D&A toggles

### Composants clés
- `KpiCard` auto-tooltip via dictionnaire ANALYSES
- `LineWithAnalysis` + `InfoLabel` tooltips néophyte sur 80+ métriques
- `SynthesisCard` paragraphe dynamique
- `ScenarioSwitcher` badge scénario + lien /scenarios
- `AutoSaver` indicateur fork save flottant
- `StartMonthPicker` mois + label + presets FY
- `SectionHeader` barre verticale colorée

### Database Supabase
Project: `sivxrsztgbbcnqttgtgl` (CFRG Coach Flow)
- `bp_scenarios`: id, user_id, name, params jsonb, is_master, version, parent_id, author_email, published_at, previous_params (backup trigger), is_active
- `bp_access`: id, email, role (admin/viewer), invited_by
- RLS: viewers voient leurs forks + masters, admins gèrent tout
- Functions: `bp_is_admin()`, `bp_has_access()`

---

## À construire — Backlog priorisé

### 🔴 PRIORITÉ IMMÉDIATE — À FAIRE EN PREMIER

#### 0. Collapse/uncollapse lignes /pnl
- Sur `/pnl` (Compte de résultat), permettre de déplier/replier les lignes agrégées (CA, OPEX, EBITDA, EBIT, etc.)
- Cliquer sur la ligne agrégée → expand pour voir les sous-composants qui la composent
- Exemples:
  - **CA** → Nouveaux abos, Legacy, Prestations, Merchandising (déjà partiellement présent en lignes ↳)
  - **Total OPEX** → Salaires, Loyer, Récurrent, Marketing, Provisions, Ponctuels
  - **Salaires** → Cadres salariés (par poste) + Freelance pools (par pool)
  - **Récurrent** → Liste détaillée (Électricité, Eau, Ménage, Assurance, Compta, ...)
  - **Loyer** → Loyer base + Charges copropriété + Taxes annuelles
  - **CAPEX** → Équipement, Travaux, Juridique, Dépôts
  - **Intérêts** → par emprunt + par obligation
  - **D&A** → équipement (5y) + travaux (10y) séparé
- UI: chevron ▶ / ▼ à gauche du libellé, sous-lignes indentées
- État expand persistant en local (localStorage par row id)
- Bouton "Tout déplier" / "Tout replier" en haut
- Étendre aussi à `/cashflow` et `/balance-sheet` si possible

**Pourquoi**: comprendre la composition de chaque total. Indispensable pour audit interne et investisseurs qui creusent les chiffres.

### TOP 3 (impact immédiat)

#### 1. Vue investisseur read-only
- Route `/investor-view` avec sidebar simplifiée (KPIs + P&L + cashflow + audit)
- Token partage révocable + lien signé
- Auth Clerk ou Supabase magic link
- Désactiver édition + auto-save
- Watermark "Confidentiel - {nom investisseur}"
- **Pourquoi**: partager BP sans donner accès édition

#### 2. Validation contraintes + alertes
- Validate sur save: mix abos = 100% sinon warning
- Capacité dépassée → alerte critique sur dashboard
- Trésorerie négative → bandeau rouge persistant
- Charges patronales <0 ou >100% → bloquer
- BFR cohérent vs CA
- Page `/health-check` avec diagnostic 360°
- **Pourquoi**: éviter erreurs de saisie silencieuses

#### 3. Backup JSON + onboarding wizard
- Export/import JSON complet du scénario (paramètres + notes)
- Wizard premier login: 5 étapes (timeline, ramp, salaires, financement, save)
- Pré-remplir avec défauts intelligents
- **Pourquoi**: sécurité données + adoption associés

### Modèle financier

#### 4. Reprise déficits fiscaux
- Reporter pertes années 1-2 sur années rentables
- Calcul `taxableIncomeAfterCarryForward`
- Display "déficit reporté" dans P&L

#### 5. TVA collectée/déductible
- Modéliser flux TVA mensuel
- Crédit TVA M0 vs paiement net trimestriel
- Impact tréso non négligeable

#### 6. Provisions IS trimestrielles
- Acomptes IS (mars/juin/sept/déc)
- Solde mai N+1
- Décalage paiement vs comptable

#### 7. Crédit d'impôt
- CIR (recherche)
- Crédit apprentissage
- Aide JEI si éligible

#### 8. BFR détaillé
- Créances clients (Square 3j)
- Dettes fournisseurs (30j typique)
- Stock (négligeable)
- Variation séparée par composant

#### 9. D&A par poste CAPEX
- Actuellement: équipement 5y + travaux 10y global
- Détailler par item (machines 7y, info 3y, mobilier 10y)

### UX

#### 10. Multi-scénarios side-by-side
- Sélectionner 2-4 scénarios
- Tableau comparatif KPIs sur même page
- Synchroniser scroll/charts

#### 11. Notes par champ (cell-level annotations)
- Hover champ → bouton "+ note"
- Stocker `params.fieldNotes: Record<path, {note, author, date}>`
- Affichage badge si note présente
- Display dans /assumptions

#### 12. Sources documentées (uploads)
- Supabase Storage bucket `bp-attachments`
- Upload PDF (bail, devis, contrats) attachés à champs
- Liste des pièces jointes par scénario

#### 13. Recherche globale Cmd+K
- shadcn command palette
- Index tous params + pages
- Navigation rapide

### Investisseur / pitch

#### 14. Pitch deck 1-page PNG/PDF
- Template PNG synthèse (KPIs + chart + logo + tagline)
- Export via html2canvas ou Vercel OG image
- Lien partageable

#### 15. Cap table
- Composants params: shareholders[] (name, shares, type)
- Calcul % détention
- Modélisation dilutions futures (option pool, future raises)

#### 16. Term sheet template
- Conditions levée formalisées (valuation pre/post, anti-dilution, etc.)
- Génération PDF auto

### Analyse avancée

#### 17. Monte Carlo
- 1000+ simulations avec drivers aléatoires (CA ±20%, salaires ±10%, etc.)
- Distribution IRR/EBITDA avec intervalles confiance 90%/95%
- Histogram + percentiles
- Library: `d3-random` ou custom

#### 18. Comparables marché
- TAM/SAM/SOM secteur fitness Paris
- Benchmark prix moyens, churn typique, CAC industrie
- Sources: étude Xerfi, FFGym, etc.

#### 19. Cohort retention par tier
- Courbes retention différenciées (Illimité 24mo / 4séances 6mo)
- LTV par tier
- Mix optimal pour LTV max

#### 20. Variance analysis
- Une fois en exploitation: comparer réel vs prévu
- Import CSV ou intégration Square/Stripe
- Alerte écart > 10%

#### 21. Waterfall charts
- Décomposition CA: legacy + nouveaux + prestations
- Décomposition EBITDA: CA - salaires - loyer - reste
- Variations year-over-year

### Robustesse

#### 22. Tests automatisés
- Vitest setup
- Tests unitaires `compute.ts` (cas xlsx connus)
- Snapshot tests UI critiques
- CI GitHub Actions

#### 23. Versioning étendu
- Diff visuel ligne par ligne entre 2 masters
- Annotations changelog par publish

### Banquier / officiel

#### 24. Plan financement détaillé an 1 par quinzaine
- Modélisation 24 quinzaines (tréso fine)
- Critique pour dossier bancaire

#### 25. Notation BCE / éligibilité PGE
- Indicateurs requis par BPI/banques
- Fonds propres / total bilan
- DSCR contraintes

#### 26. Caution personnelle + garanties
- Paramètre `personalGuarantee: number`
- Nantissement fonds de commerce
- BPI / OSEO

---

## Étude de marché & contexte investisseur

Section critique pour dossier banque + pitch investisseur. Manquante actuellement.
Ajout d'une zone navigation **"Stratégie & Marché"** dans la sidebar.

### Pages à créer

#### 27. `/market` — Étude de marché
**Sous-sections en onglets:**

- **Taille du marché**
  - TAM (Total Addressable Market) — Marché fitness France
  - SAM (Serviceable Addressable Market) — Crossfit + fonctionnel Paris
  - SOM (Serviceable Obtainable Market) — Cible CFRG sur zone géographique
  - Sources: Xerfi, INSEE, FFGym, Statista
  - Visualisation: 3 cercles concentriques avec montants €

- **Tendances secteur**
  - Croissance fitness France 5 dernières années (CAGR)
  - Pénétration CrossFit (boxes vs population)
  - Tendances post-COVID (boutique gyms, communauté, hybrid)
  - Hyrox émergent — ramp adoption
  - Source: rapports IHRSA, Les Mills, Statista
  - Graphes: ligne temporelle croissance

- **Segmentation clients (personas)**
  - 3-5 personas types (CSP+ 30-45 ans, sportifs amateurs, pros préparation Hyrox, ...)
  - Pour chaque: âge, revenu, motivations, prix accepté, fréquence
  - Cartes visuelles avec photo type + métriques

- **Concurrence directe** (CrossFit Paris 13/RG)
  - Liste boxes Paris zone (Reebok, Train Yard, Louvre, Belleville, ...)
  - Tableau comparatif: prix, capacité, USP, ancienneté, reviews Google
  - Carte interactive Paris

- **Concurrence indirecte**
  - Salles fitness classiques (Basic Fit, On Air, Neoness)
  - Studios spécialisés (Episod, Resilience, Klay)
  - Home fitness (Peloton, FreeBeat, apps)

- **Positionnement (USP)**
  - Matrice positionnement (axes: prix × spécialisation)
  - Différenciation CFRG (CrossFit + Hyrox + sandbox)
  - Réponses aux objections classiques

- **Barrières à l'entrée**
  - CAPEX requis
  - Affiliation CrossFit HQ
  - Coachs certifiés (rareté)
  - Bail commercial (zone tendue)

- **Réglementation**
  - Affiliation CrossFit + Hyrox
  - Code du sport
  - Hygiène / DDPP
  - URSSAF coachs freelance
  - Assurance responsabilité civile pro

#### 28. `/strategy` — Stratégie & modèle d'affaires
**Sous-sections:**

- **Vision / mission / valeurs**
- **Business Model Canvas** (9 blocs):
  - Segments clients
  - Proposition valeur
  - Canaux distribution
  - Relation client
  - Sources revenus
  - Ressources clés
  - Activités clés
  - Partenaires clés
  - Structure coûts
- **Stratégie d'acquisition** (digital, partenariats, événements, parrainage)
- **Stratégie de rétention** (communauté, gamification, programmes)
- **Pricing strategy** (psychologique, ancrage, freemium drop-in)
- **Partenariats stratégiques** (kiné, nutritionniste, marques sportives, entreprises)

#### 29. `/team` — Équipe & gouvernance
- **Bios fondateurs** (3-5 lignes par personne + photo + LinkedIn + expertise)
- **Conseil d'administration / advisors**
- **Plan de recrutement** (timeline embauches sur 7 ans)
- **Organigramme** (visualisation hiérarchique)
- **Culture / valeurs équipe**

#### 30. `/risks` — Matrice de risques (étendre /audit)
- **Matrice 2D** impact × probabilité (5×5)
- **5 catégories**:
  - Marché (concurrence, baisse demande)
  - Opérationnel (départ coach clé, équipement HS)
  - Financier (cash crunch, taux hausse)
  - RH (recrutement difficile, conflits)
  - Réglementaire (changement loi, contrôle URSSAF)
- **Plans de mitigation** par risque
- **Indicateurs alerte précoce**

#### 31. `/milestones` — Jalons & roadmap projet
- **Timeline Gantt** des jalons clés:
  - Signature bail
  - Levée fonds closé
  - Travaux début/fin
  - Affiliation CrossFit officialisée
  - Recrutement Headcoachs
  - Soft launch
  - Grand opening
  - Atteinte 200 abos
  - Break-even cashflow
  - Levée série A (si applicable)
- **KPIs trackés** par jalon
- **Owner** par milestone

#### 32. `/competitive-analysis` — Analyse concurrentielle approfondie
- **Benchmark 5-10 boxes Paris**:
  - Prix abos
  - Mix produit
  - Capacité (m², équipement)
  - Reviews Google (note + nb avis)
  - Trafic estimé (Foot Traffic / SimilarWeb)
  - Réseaux sociaux (followers, engagement)
- **Tableau comparatif** sortable
- **Carte géographique** Paris avec markers prix

#### 33. `/use-of-funds` — Utilisation détaillée des fonds (visuel)
- Sankey diagram: Sources → Catégories → Postes
- Pourcentages
- Justification ligne par ligne
- Lien avec /balance-sheet emplois/ressources

#### 34. `/exit-strategy` — Stratégie de sortie investisseurs
- **Options**:
  - Rachat dirigeants (LBO interne)
  - Cession à groupe fitness (Basic Fit, OnAir, ...)
  - Franchise / multi-sites (réinvestissement)
- **Timing** (5-7 ans typique)
- **Multiples sectoriels** (EBITDA × 4-6 typique)
- **Valorisation projetée** sous différents scénarios

#### 35. `/swot` — Analyse SWOT
- 4 cadrans visuels:
  - Strengths (forces internes)
  - Weaknesses (faiblesses internes)
  - Opportunities (opportunités externes)
  - Threats (menaces externes)
- Note quantifiée par item (1-5)
- Plan action par croisement (SO, ST, WO, WT)

#### 36. `/financial-highlights` — Synthèse 1-page financière
- Pour pitch deck investisseur
- Top 8 chiffres clés (CA, EBITDA, marge, IRR, multiple, payback, levée, break-even)
- 2 graphiques (CA + EBITDA)
- 1 paragraphe synthèse
- Bouton "Exporter PNG"

#### 37. `/data-room` — Espace documentaire
- Upload Supabase Storage:
  - Bail commercial signé
  - Statuts société
  - K-bis
  - Devis travaux + équipement
  - Lettres d'intention bailleur
  - CV fondateurs
  - Contrats partenaires (CrossFit affiliation, Hyrox, ...)
  - Études marché commandées
  - Avis comptable
  - Pièces juridiques
- Permissions par investisseur (read-only avec watermark)
- Logs accès (qui a vu quoi)

#### 38. `/customer-validation` — Validation client
- **Sondages pré-ouverture** (Typeform/Tally)
- **Pré-inscriptions** (count + LTV potentiel)
- **NPS pilote** si Javelot existe
- **Tickets de support** patterns (douleurs récurrentes)
- **Témoignages** (Javelot legacy)

#### 39. `/financial-glossary` — Glossaire investisseur
- Étendu vs `/assumptions`
- 50+ termes avec définition + exemple chiffré
- Filtrage par catégorie
- Cherche-trouve rapide

#### 40. `/scenario-narrative` — Narratif scénarios
- Pour chaque scénario (base, pessimist, optimist):
  - Storyline en prose (2-3 paragraphes)
  - Hypothèses différenciantes vs base
  - Conséquences chiffrées
  - Probabilité estimée
- Format pitch readable

---

## Priorisation suggérée

**Phase 0 (urgence)** — UX critique:
- **#0 Collapse/uncollapse lignes /pnl** ⚠️ À FAIRE EN PREMIER

**Phase 1 (sprint 1)** — Production-ready pour partage:
- #1 Vue investisseur read-only
- #2 Validation contraintes
- #3 Backup JSON + onboarding

**Phase 2 (sprint 2)** — Modèle complet pour banquier:
- #4 Déficits fiscaux
- #5 TVA flux mensuel
- #8 BFR détaillé
- #24 Plan financement quinzaines

**Phase 3 (sprint 3)** — Analyse premium:
- #17 Monte Carlo
- #10 Multi-scénarios side-by-side
- #11 Notes par champ
- #21 Waterfall charts

**Phase 4 (sprint 4)** — Pitch investisseur:
- #14 Pitch deck PNG
- #15 Cap table
- #18 Comparables marché

**Phase 5 (sprint 5)** — Étude de marché & contexte:
- #27 /market (TAM/SAM/SOM + concurrence + tendances)
- #28 /strategy (Business Model Canvas)
- #29 /team (bios + recrutement)
- #36 /financial-highlights (synthèse 1-page)
- #37 /data-room (uploads documents)

**Phase 6 (sprint 6)** — Approfondissement investisseur:
- #30 /risks (matrice 5x5)
- #31 /milestones (Gantt projet)
- #32 /competitive-analysis (benchmark détaillé)
- #34 /exit-strategy (sortie investisseurs)
- #35 /swot (analyse SWOT)
- #38 /customer-validation (preuves marché)
- #40 /scenario-narrative (storyline scénarios)

---

## Comment reprendre

Dans nouvelle discussion, donner ce contexte:
> Reprends le projet BP CFRG (https://github.com/tsilveira-ship-it/bp-cfrg). Lis ROADMAP.md à la racine. Je veux build [item N°X].

Le repo a un README.md + AGENTS.md + CLAUDE.md à la racine pour contexte technique.

## Conventions
- Brand: `#D32F2F` (red), `#1a1a1a` (ink), Oswald (heading) + Montserrat (body)
- Caveman mode si activé
- Auto-save fork Supabase
- Tooltips néophyte via `lib/analyses.ts` dictionnaire
- Sections groupées avec `SectionHeader` (rouge=charges, vert=recettes, bleu=invest, ambre=fiscal)
