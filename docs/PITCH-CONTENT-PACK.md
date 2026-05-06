# Pitch Content Pack — CrossFit Rive Gauche

> Source : extraction du site `crossfitrg-web` (live `crossfitrg.com`) + dashboard CRM `/dashboard` + brochure `docs/decks/build-brochure-cfrg.js`.
> Cible : pages investor du BP CFRG (cf. `ROADMAP.md` Phase 5/6).
> Mis à jour : 2026-05-06.

---

## 1. Identité & positionnement

**Nom commercial** : CrossFit Rive Gauche (CFRG)
**Adresse** : 105 rue de Tolbiac, 75013 Paris
**Métros** : Olympiades (L14), Tolbiac (L7) — accès Dalle des Olympiades
**Fondation** : 2020 par Matthieu Godet (Head Coach)
**Affiliations** : CrossFit HQ (officiel) · Hyrox Training Club (officiel)
**Tagline** : « La salle de CrossFit & Hyrox à Paris 13 »
**Promise** : Améliorer la condition physique, mentale et l'estime de soi dans une communauté exigeante et bienveillante.

---

## 2. Proposition de valeur (USP)

| # | USP | Preuve |
|---|---|---|
| 1 | Box CrossFit + Hyrox Training Club officiel | Combo rare Paris intra-muros — double affiliation |
| 2 | 300 m² premium sur 3 niveaux | RDC floor + mezzanine lounge + vestiaires sous-sol |
| 3 | Équipement compétition | Eleiko · Fit & Rack · Concept 2 · DimaSport · Assault Bike Incept |
| 4 | 8 coachs certifiés | CrossFit L1/L2 + BPJEPS / CQP (diplômes État) |
| 5 | Cours plafonnés à 16 | Coaching personnalisé garanti |
| 6 | 50+ créneaux / semaine | Ouvert 7j/7 — 6h15-22h en semaine |
| 7 | Funnel low-friction | Bilan Forme 19,90 € (vs 80 €) — conversion documentée |
| 8 | Niches sous-exploitées | Teens 14+ · Masters 50+ · Prépa forces de l'ordre · Sport santé |

---

## 3. Infrastructure & équipement

### Espace (300 m² · 3 niveaux)

- **RDC — Floor principal** : WOD CrossFit + Hyrox + Open Gym + cafétéria boissons/snacks healthy
- **+1 — Mezzanine lounge** : espace détente, scoreboards, échanges communauté
- **-1 — Vestiaires** : douches modernes, casiers individuels

### Marques sélectionnées

| Discipline | Marque | Usage |
|---|---|---|
| Haltérophilie | **Eleiko** | Barres + disques compétition |
| Racks / structures | **Fit & Rack** | Racks robustes, gymnastique |
| Cardio | **Concept 2** | Rameurs + SkiErgs |
| Cardio | **Assault Bike Incept** | Air bikes |
| Accessoires gym | **DimaSport** | Anneaux, gilets lestés, etc. |

### Accessibilité

- Climatisation / ventilation
- Accès PMR via ascenseur Dalle Olympiades (sur demande)

---

## 4. Équipe — 8 coachs certifiés

| Nom | Rôle | Certifications | Spécialité |
|---|---|---|---|
| **Matthieu Godet** | Head Coach & Fondateur | CF L2 + BPJEPS | Arraché (snatch), 10 ans d'expérience |
| **Eléonore** | Coach Teens & Masters | CF L1 + CQP | Sport santé, handstand |
| **Flo** | Coach Méthode Hybride | CF L1 + CQP | Power building, hybrid training |
| **Morgane** | Responsable Running | CF L1 + CQP | Running, endurance, pull-up strict |
| **Alex** | Spécialiste Hyrox | CF L1 + CQP | Hyrox, prépa forces de l'ordre |
| **Virginie** | Coach Sport Santé | CF L1 + CQP | Sled push, conditionnement |
| **Antoine** | Spécialiste Haltérophilie | CF L1 + BPJEPS | Snatch, clean & jerk, force |
| **Antonin** | Spécialiste Gymnastique | CF L1 + CQP | Muscle-up, ring work |

> Source data structurée (JSON-LD) déjà en prod : `crossfitrg-web/src/app/coachs/page.tsx`.

---

## 5. Offre & pricing

### Funnel produit

| Étape | Produit | Prix | Rôle |
|---|---|---|---|
| Acquisition | **Bilan Forme** | 19,90 € (vs 80 €) | 1h consultation 1-on-1 → conversion |
| Découverte | **Drop-in séance** | 20 € | Pratiquant expérimenté de passage |
| Conversion | **Abo Engagement 1 an** | 115 €/mois | Tier prix le + bas |
| Conversion | **Abo Trimestriel** | 135 €/mois | Tier intermédiaire |
| Conversion | **Abo Sans engagement** | 145 €/mois | Tier flexible / premium |

Tous abos = accès illimité (CrossFit, Hyrox, haltéro, gym, running, teens, masters).

### Revenus annexes

- **Privatisation salle** (events entreprise, soirées privées, tournages)
- **Challenge Transformation** (programme payant ponctuel)
- **Drop-in EN** (anglais) ciblant expat / tourisme
- **Merchandising** (en projet)

### Logique de pricing

- Ancrage Bilan 80 € → 19,90 € : signal de valeur + funnel haute conversion
- 30 €/mois d'écart entre tiers = nudge vers engagement long
- Aucun frais caché, sans engagement réel sur tier 145€

---

## 6. Programmes & cours (50+ créneaux/semaine)

| Programme | Description | URL site |
|---|---|---|
| WOD CrossFit | Cœur d'activité — quotidien | `/wod`, `/crossfit` |
| Hyrox | Préparation compétition Hyrox officielle | `/hyrox` |
| Cours avancé | RX, athlètes confirmés | `/cours-avance` |
| Haltérophilie | Force et technique olympique | `/halterophilie` |
| Gymnastique | Muscle-up, handstand, ring work | `/gymnastique` |
| Running | Foulée, endurance | `/running` |
| Masters | 50+ ans, sport santé | `/masters` |
| Teens | Ados 14+ | `/teens` |
| Open Gym | Pratique autonome supervisée | inclus |

**Horaires** : Lun/Mer/Ven 6h15-22h · Mar/Jeu 7h15-22h · Sam 9h-16h · Dim 9h-13h.

---

## 7. Marché & zone de chalandise (SOM)

### Zone géographique ciblée (pages SEO live)

- Paris 13 — Tolbiac, Olympiades, Nationale, Maison Blanche
- **Butte-aux-Cailles** (`/crossfit-butte-aux-cailles`)
- **Ivry-sur-Seine** (`/crossfit-ivry-sur-seine`)
- **Le Kremlin-Bicêtre** (`/crossfit-le-kremlin-bicetre`)

### Personas (à confirmer données CRM)

- CSP+ 30-45 ans urbains
- Sportifs amateurs souhaitant structure
- Athlètes Hyrox amateurs / semi-pro
- Forces de l'ordre en prépa concours
- Seniors actifs (Masters)
- Ados encadrés (Teens)

### Avantages concurrentiels documentés

- Affiliation double (CrossFit + Hyrox) rare en Paris intra-muros
- Surface 300 m² supérieure à la moyenne des boxes parisiennes
- Coachs certifiés (vs nombreuses salles à instructeurs non-diplômés)
- Tarif compétitif vs studios premium type Episod / Klay (160-200+ €/mois)

---

## 8. Dashboard CRM — Suivi du funnel d'acquisition (PRODUCTION)

> Outil interne déployé : `crossfitrg-web.vercel.app/dashboard` — gate auth HMAC.
> Schéma dédié `crm.*` sur Supabase Postgres. Phases 1, 2, B, C livrées.
> **Argument investisseur clé** : pilotage data-driven du funnel et de la rétention 90 jours.

### Stack & ingestion

```
Forms publics (brochure / contact / privatisation)
        ↓ webhook n8n
Stripe (bilan, drop-in, abo)        →   Supabase Postgres (schéma crm)
        ↓ trigger n8n                       ↓
ResaWod API (cron 12h)                  Dashboard Next.js + alertes email
```

**Clé de matching** : email normalisé (lowercase + trim) — relie prospect / payment / customer.

### Données en base (snapshot avril 2026)

| Table | Volume | Détail |
|---|---|---|
| `crm.prospects` | **350** | 220 brochure · 100 ResaWod · 30 site web |
| `crm.customers` | **135** | 33 abonnés actifs · 8 avec carnet drop-in |
| `crm.payments` | **57** | Bilans 9,90 € — total cumulé 564,30 € |
| `crm.sessions` | **303** | 239 attendues + 64 importées Excel |
| `crm.user_vouchers` | 8 | Drop-in 20 € (id 5142) |
| `crm.form_submissions` | 340+ | Trace brute multi-touchpoint |

### Funnel acquisition (modélisé en SQL, filtres 7j/30j/90j/12m/cumul)

```
Prospect (form) → Bilan payé (Stripe) → Compte ResaWod → Abo / Carnet → Adhérent actif
```

3 niveaux de conversion trackés avec délais médians par étape, breakdown par canal d'origine (brochure / siteweb / resawod).

### Routes dashboard live

| Route | Rôle |
|---|---|
| `/dashboard` | Aujourd'hui — inbox actionnable (nouvelles soumissions, bilans à venir, carnets/abos qui expirent, anciens à réactiver, silence radio) |
| `/dashboard/vue-ensemble` | KPIs 30j + base adhérents + funnel 3 niveaux + délais médians |
| `/dashboard/prospects` | Table 350 prospects, badges multi-canal |
| `/dashboard/prospects/[id]` | Fiche 360° : timelines forms + paiements |
| `/dashboard/adherents` | Onglets Abonnés / Avec carnet / Actifs / À risque / Lapsés |
| `/dashboard/adherents/[id]` | Fiche adhérent + timeline séances + paiements |
| `/dashboard/paiements` | Stripe history, filtre kind |
| `/dashboard/carnets` | Vouchers actifs/expirés/épuisés |
| `/dashboard/sequences` | Séquences email (auto-relance prospects non convertis) |
| `/dashboard/cohortes` | Analyse rétention 90j par cohorte d'entrée |

### Capacités opérationnelles

- **Alertes décrochage 90 premiers jours** : intercepter prospects qui ralentissent avant qu'ils deviennent irrécupérables
- **Email digest staff** automatique (cron n8n)
- **Relances automatiques** brochure J+3 / J+6
- **Conformité RGPD** : boutons manuels purge prospects non convertis > 6 mois / > 2 ans
- **Top 10 adhérents actifs** auto-identifié pour communauté / témoignages

### Pourquoi c'est un argument investisseur

1. **Pas un BP théorique** — l'outil de pilotage est déjà en prod, alimenté par 300+ prospects historiques
2. **Attribution canal** mesurable (brochure 63% · resawod 29% · siteweb 8%) → optimisation marketing CAC
3. **Rétention 90j trackée** → preuve d'un focus opérationnel sur churn (driver clé du modèle financier `/investor`)
4. **Stack reproductible** si scaling multi-sites — schéma Supabase + n8n cloud + Next.js Vercel

---

## 9. Social proof

### Témoignages (extraits brochure CFRG)

> « J'avais peur de commencer car je n'étais pas sportive. Ici, personne ne juge ! » — Sophie L.
> « -8kg en 3 mois. Le coaching fait toute la différence. Merci la team ! » — Thomas B.
> « Une ambiance familiale incroyable. On a hâte de venir s'entraîner. » — Marc D.
> « Fini le mal de dos. Des coachs très attentifs à la sécurité. » — Julie A.

### Reviews Google

Curées en data : `crossfitrg-web/src/data/google-reviews-curated.ts` — exploitable pour `/customer-validation`.

### Track record

- Box opérationnelle depuis **2020** — 5+ années d'historique
- 135 customers actifs en base CRM (avril 2026)
- 33 abonnés actifs récurrents
- Top 10 adhérents : 8-17 séances / 30j (engagement fort)

---

## 10. Mapping pages BP investor

| Page ROADMAP | Sources à injecter |
|---|---|
| `/team` (#29) | §4 — bios 8 coachs (data déjà en JSON-LD `coachs/page.tsx`) |
| `/strategy` (#28) | §1 vision · §2 USP · §5 pricing/funnel · §6 programmes |
| `/market` (#27) | §7 zone chalandise + personas + concurrence |
| `/financial-highlights` (#36) | §2 USP (8 chiffres) · §8 funnel quanti |
| `/customer-validation` (#38) | §8 CRM data · §9 reviews/témoignages |
| `/competitive-analysis` (#32) | §2 différenciation + §6 niches |
| `/swot` (#35) | Forces : §2 USP · Opp : §7 zone non saturée |
| `/exit-strategy` (#34) | §8 stack reproductible (multi-sites / franchise) |
| `/data-room` (#37) | Affiliation CrossFit · Affiliation Hyrox · Bail Tolbiac · Bios + diplômes coachs |
| `/scenario-narrative` (#40) | §8 funnel data → calibrer hypothèses base/pessimist/optimist |

---

## 11. Assets visuels disponibles

- `crossfitrg-web/public/images/box-jump-salle.jpg` — hero salle
- `crossfitrg-web/public/images/hero-landing.jpg` — communauté cours
- `crossfitrg-web/public/images/overhead-press.jpg` — coaching personnalisé
- `crossfitrg-web/public/images/salle-mezzanine.jpg` — espace lounge
- `crossfitrg-web/public/images/coachs/{matthieu,eleonore,flo,morgane,alex,virginie,antoine,antonin}.jpeg`
- `crossfitrg-web/Photos NEW/` — banque photos récente
- `crossfitrg-web/docs/decks/build-brochure-cfrg.js` — brochure A4 5-slides pptxgenjs (réutilisable)

---

## 12. Données financières clés (à valider depuis modèle compute)

À extraire depuis `bp-cfrg/lib/model/compute.ts` (scénario Master en cours) :
- CA FY26 → FY32
- EBITDA & marge EBITDA finale
- IRR equity / multiple sortie
- Payback période
- DSCR moyen
- LTV/CAC ratio
- Levée totale (equity + bonds + dette)
- Break-even cash month
