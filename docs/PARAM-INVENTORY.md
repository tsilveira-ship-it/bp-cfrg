# Audit param-par-param — Scénario Base

> Généré: 2026-05-12T11:21:26.290Z

## Résumé

- Paramètres totaux (incl. métadonnées) : **296**
- Paramètres business (à auditer) : **296**

### Trous dans la raquette

- Sans source documentée : **209**
- Critiques/Hauts non validés 4-eyes : **64**
- Hors benchmark sectoriel : **1**

### Répartition par catégorie

- benchmarks : 39
- bfr : 1
- capex : 4
- cash : 1
- costs.marketing : 3
- costs.oneoff : 20
- costs.provisions : 3
- costs.recurring : 44
- costs.rent : 3
- costs.salaries : 58
- financing.bonds : 10
- financing.equity : 8
- financing.loans : 6
- heuristics : 10
- montecarlo : 3
- revenue.legacy : 3
- revenue.merch : 2
- revenue.prestations : 8
- revenue.subscriptions : 27
- stress : 1
- tax : 7
- thresholds.audit : 30
- thresholds.investor : 3
- timeline : 2

### État sourcing

- unmapped : 203
- to-validate : 73
- missing : 6
- validated : 14

### Criticité

- unknown : 203
- high : 30
- medium : 22
- low : 7
- critical : 34

### Validation 4-eyes

- none : 296

---

## Benchmarks agrégés (métriques dérivées)

| Métrique | Valeur | Formule | Benchmark | Range | Verdict | Commentaire |
|----------|--------|---------|-----------|-------|---------|-------------|
| ARPU pondéré (€/mois TTC) | 119,5 | `Σ tier.monthlyPrice × tier.mixPct` | monthlyPriceCrossfit | 130–220 | below | Mix actuel: 10%/40%/20%/20%/10% |
| CAC implicite Y1 (€/membre) | 270 | `marketing.monthlyBudget × 12 / (rampEnd - rampStart)` | cacFitness | 80–150 | above | Hyp: 120 new members Y1 acquis pour 32 400€ |
| Membres fin d'horizon (estimation simple) | 596,76 | `rampEnd × Π (1 + growthRates[i])` | membersMatureCrossfit | 250–450 | above | Hors churn — borne haute du modèle. Box parisienne mature: 250-450. |
| Churn mensuel global (%/mo) | 0 | `subs.monthlyChurnPct` | churnCrossfitCommunity | 0.015–0.03 | below | CHURN = 0 — kill VC selon vc-audit.ts |
| Taux IS (%) | 25.00% | `tax.isRate` | isRateFR | 0.15–0.25 | in-range | CGI: 15% jusque 42500€, puis 25%. |

---

## Détail par paramètre

| Path | Catégorie | Valeur | Criticité | Source | État | Benchmark | Verdict | Validation | Tests |
|------|-----------|--------|-----------|--------|------|-----------|---------|------------|-------|
| `auditThresholds.bfrCriticalDays` | thresholds.audit | 180 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.bfrWarnDays` | thresholds.audit | 90 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.bondDeferralMinYears` | thresholds.audit | 2 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.capacityAlertSaturation` | thresholds.audit | 95.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.capacityCriticalSaturation` | thresholds.audit | 1 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.cashBufferThinEur` | thresholds.audit | 50 000 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.cashThinHealthEur` | thresholds.audit | 10 000 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.cashThinSynthesisEur` | thresholds.audit | 50 000 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.churnKillLevel` | thresholds.audit | 0 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.churnMajorThreshold` | thresholds.audit | 1.50% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.daThresholdCapex` | thresholds.audit | 50 000 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.debtRatioMax` | thresholds.audit | 50.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.dscrGoodThreshold` | thresholds.audit | 1.2 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.dscrLimitThreshold` | thresholds.audit | 1 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.ebitdaMarginAlertNeg` | thresholds.audit | -10.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.founderMinPct` | thresholds.audit | 60.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.growthMagicChurn` | thresholds.audit | 2.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.growthMagicYoy` | thresholds.audit | 30.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.irrGoodThreshold` | thresholds.audit | 15.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.isThresholdNetIncome` | thresholds.audit | 50 000 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.loanRateMaxPlausiblePct` | thresholds.audit | 30 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.ltvCacGoodThreshold` | thresholds.audit | 3 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.ltvCacMin` | thresholds.audit | 3 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.ltvCacWarnThreshold` | thresholds.audit | 1 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.rentJumpRatio` | thresholds.audit | 1.3 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.salaryPctHighThreshold` | thresholds.audit | 50.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.salaryPctMediumThreshold` | thresholds.audit | 35.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.verdictKillMinCount` | thresholds.audit | 1 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.verdictMajorBlockingCount` | thresholds.audit | 4 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `auditThresholds.verdictMajorWarnCount` | thresholds.audit | 1 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `bfr.daysOfRevenue` | bfr | 0 | high | Encaissement Square + délais fournisseurs | to-validate | — | n/a | none | — |
| `capacityHeuristics.coachHoursPerFteMonth` | heuristics | 130 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `capacityHeuristics.cohortShareLong` | heuristics | 40.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `capacityHeuristics.cohortShareMid` | heuristics | 35.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `capacityHeuristics.cohortShareNew` | heuristics | 25.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `capacityHeuristics.expectedFillRate` | heuristics | 70.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `capacityHeuristics.memberHoursDemandPerMonth` | heuristics | 12 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `capacityHeuristics.overflowSaturation` | heuristics | 1.5 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `capacityHeuristics.peakRatioThreshold` | heuristics | 40.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `capacityHeuristics.productiveRatio` | heuristics | 90.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `capacityHeuristics.targetSaturationDefault` | heuristics | 75.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `capex.depots` | capex | 78 000 | medium | Dépôt garantie bail + autres | to-validate | — | n/a | none | — |
| `capex.equipment` | capex | 74 252 | high | Devis équipement CrossFit/Hyrox | to-validate | — | n/a | none | — |
| `capex.juridique` | capex | 23 950 | low | Honoraires avocat + greffe + études | to-validate | — | n/a | none | — |
| `capex.travaux` | capex | 100 000 | critical | Devis travaux aménagement local | to-validate | — | n/a | none | Scénario travaux +30% / -3 mois retard |
| `financing.bonds[0].amortization` | financing.bonds | bullet | unknown | Non documenté | unmapped | — | n/a | none | — |
| `financing.bonds[0].annualRatePct` | financing.bonds | 6 | high | Marché obligations PME | to-validate | — | n/a | none | — |
| `financing.bonds[0].capitalizeInterest` | financing.bonds | true | high | Term sheet PIK | to-validate | — | n/a | none | — |
| `financing.bonds[0].deferralYears` | financing.bonds | 2 | high | Term sheet | to-validate | — | n/a | none | — |
| `financing.bonds[0].frequency` | financing.bonds | 1 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `financing.bonds[0].id` | financing.bonds | bond_1 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `financing.bonds[0].name` | financing.bonds | Obligation non convertible (in fine, différé capitalisé) | unknown | Non documenté | unmapped | — | n/a | none | — |
| `financing.bonds[0].principal` | financing.bonds | 200 000 | critical | Investisseurs obligataires | missing | — | n/a | none | — |
| `financing.bonds[0].startMonth` | financing.bonds | 0 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `financing.bonds[0].termYears` | financing.bonds | 5 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `financing.equity[0].amount` | financing.equity | 100 000 | critical | Engagements fonds propres | to-validate | — | n/a | none | — |
| `financing.equity[0].id` | financing.equity | apport_perso | unknown | Non documenté | unmapped | — | n/a | none | — |
| `financing.equity[0].name` | financing.equity | Apport personnel | unknown | Non documenté | unmapped | — | n/a | none | — |
| `financing.equity[0].startMonth` | financing.equity | 0 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `financing.equity[1].amount` | financing.equity | 300 000 | critical | Engagements fonds propres | to-validate | — | n/a | none | — |
| `financing.equity[1].id` | financing.equity | levee | unknown | Non documenté | unmapped | — | n/a | none | — |
| `financing.equity[1].name` | financing.equity | Levée de fonds (associés/investisseurs) | unknown | Non documenté | unmapped | — | n/a | none | — |
| `financing.equity[1].startMonth` | financing.equity | 0 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `financing.loans[0].annualRatePct` | financing.loans | 3 | high | Indication banque | to-validate | — | n/a | none | Tornado loanRate ±30% |
| `financing.loans[0].id` | financing.loans | loan_bank | unknown | Non documenté | unmapped | — | n/a | none | — |
| `financing.loans[0].name` | financing.loans | Emprunt bancaire | unknown | Non documenté | unmapped | — | n/a | none | — |
| `financing.loans[0].principal` | financing.loans | 200 000 | critical | Term sheet bancaire | missing | — | n/a | none | — |
| `financing.loans[0].startMonth` | financing.loans | 0 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `financing.loans[0].termMonths` | financing.loans | 84 | medium | Négociation banque | to-validate | — | n/a | none | — |
| `investorAssumptions.discountRate` | thresholds.investor | 10.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `investorAssumptions.exitMultipleEbitda` | thresholds.investor | 5 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `investorAssumptions.retentionMonthsFallback` | thresholds.investor | 24 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `legacy.avgMonthlyPrice` | revenue.legacy | 120.83 | high | Tarif moyen mensuel CRM CFRG legacy | to-validate | — | n/a | none | — |
| `legacy.startCount` | revenue.legacy | 220 | high | CRM CFRG — membres actifs à reprise | to-validate | — | n/a | none | — |
| `legacy.yearlyChurnAbs` | revenue.legacy | 24 | medium | Hypothèse | missing | — | n/a | none | — |
| `marketing.indexPa` | costs.marketing | 0 | low | Décision | to-validate | — | n/a | none | — |
| `marketing.monthlyBudget` | costs.marketing | 2 700 | critical | Budget acquisition arbitré | to-validate | — | n/a | none | Tornado ±20%; Decompose par canal |
| `marketing.pctOfRevenue` | costs.marketing | 0 | high | Décision | to-validate | — | n/a | none | — |
| `mcDefaults.distribution` | montecarlo | uniform | unknown | Non documenté | unmapped | — | n/a | none | — |
| `mcDefaults.enableCorrelation` | montecarlo | true | unknown | Non documenté | unmapped | — | n/a | none | — |
| `mcDefaults.maxOpeningDelayMonths` | montecarlo | 6 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `merch.growthPa` | revenue.merch | 0 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `merch.monthlyMargin` | revenue.merch | 351 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `oneOffs[0].amount` | costs.oneoff | 4 739 | low | Factures historiques | to-validate | — | n/a | none | — |
| `oneOffs[0].id` | costs.oneoff | sacem | unknown | Non documenté | unmapped | — | n/a | none | — |
| `oneOffs[0].month` | costs.oneoff | 9 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `oneOffs[0].name` | costs.oneoff | SACEM | unknown | Non documenté | unmapped | — | n/a | none | — |
| `oneOffs[0].yearly` | costs.oneoff | true | unknown | Non documenté | unmapped | — | n/a | none | — |
| `oneOffs[1].amount` | costs.oneoff | 420 | low | Factures historiques | to-validate | — | n/a | none | — |
| `oneOffs[1].id` | costs.oneoff | doc | unknown | Non documenté | unmapped | — | n/a | none | — |
| `oneOffs[1].month` | costs.oneoff | 5 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `oneOffs[1].name` | costs.oneoff | Documentation | unknown | Non documenté | unmapped | — | n/a | none | — |
| `oneOffs[1].yearly` | costs.oneoff | true | unknown | Non documenté | unmapped | — | n/a | none | — |
| `oneOffs[2].amount` | costs.oneoff | 420 | low | Factures historiques | to-validate | — | n/a | none | — |
| `oneOffs[2].id` | costs.oneoff | extincteurs | unknown | Non documenté | unmapped | — | n/a | none | — |
| `oneOffs[2].month` | costs.oneoff | 0 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `oneOffs[2].name` | costs.oneoff | Extincteurs | unknown | Non documenté | unmapped | — | n/a | none | — |
| `oneOffs[2].yearly` | costs.oneoff | true | unknown | Non documenté | unmapped | — | n/a | none | — |
| `oneOffs[3].amount` | costs.oneoff | 350 | low | Factures historiques | to-validate | — | n/a | none | — |
| `oneOffs[3].id` | costs.oneoff | defib | unknown | Non documenté | unmapped | — | n/a | none | — |
| `oneOffs[3].month` | costs.oneoff | 0 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `oneOffs[3].name` | costs.oneoff | Défibrillateur | unknown | Non documenté | unmapped | — | n/a | none | — |
| `oneOffs[3].yearly` | costs.oneoff | true | unknown | Non documenté | unmapped | — | n/a | none | — |
| `openingCash` | cash | 0 | high | Trésorerie M0 hors financements | to-validate | — | n/a | none | — |
| `prestations.horsAbo.growthPa` | revenue.prestations | 5.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `prestations.horsAbo.monthlyAvg` | revenue.prestations | 4 166 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `prestations.senior.growthPa` | revenue.prestations | 10.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `prestations.senior.price` | revenue.prestations | 33.33 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `prestations.senior.startCount` | revenue.prestations | 10 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `prestations.teen.growthPa` | revenue.prestations | 10.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `prestations.teen.price` | revenue.prestations | 41.67 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `prestations.teen.startCount` | revenue.prestations | 10 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `provisions.indexPa` | costs.provisions | 0 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `provisions.monthlyEquipement` | costs.provisions | 450 | medium | Hypothèse renouvellement matériel | to-validate | — | n/a | none | — |
| `provisions.monthlyTravaux` | costs.provisions | 500 | medium | Hypothèse entretien locaux | to-validate | — | n/a | none | — |
| `recurring[0].category` | costs.recurring | entretien | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[0].id` | costs.recurring | elec | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[0].monthly` | costs.recurring | 3 000 | medium | Devis / contrats fournisseurs | to-validate | — | n/a | none | — |
| `recurring[0].name` | costs.recurring | Électricité | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[1].category` | costs.recurring | entretien | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[1].id` | costs.recurring | eau | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[1].monthly` | costs.recurring | 335 | medium | Devis / contrats fournisseurs | to-validate | — | n/a | none | — |
| `recurring[1].name` | costs.recurring | Eau | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[10].category` | costs.recurring | frais_op | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[10].id` | costs.recurring | tel | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[10].monthly` | costs.recurring | 60 | medium | Devis / contrats fournisseurs | to-validate | — | n/a | none | — |
| `recurring[10].name` | costs.recurring | Téléphone, Internet | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[2].category` | costs.recurring | entretien | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[2].id` | costs.recurring | menage | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[2].monthly` | costs.recurring | 5 000 | medium | Devis / contrats fournisseurs | to-validate | — | n/a | none | — |
| `recurring[2].name` | costs.recurring | Société de Ménage | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[3].category` | costs.recurring | frais_op | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[3].id` | costs.recurring | assu | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[3].monthly` | costs.recurring | 500 | medium | Devis / contrats fournisseurs | to-validate | — | n/a | none | — |
| `recurring[3].name` | costs.recurring | Assurance | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[4].category` | costs.recurring | frais_op | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[4].id` | costs.recurring | primesassu | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[4].monthly` | costs.recurring | 300 | medium | Devis / contrats fournisseurs | to-validate | — | n/a | none | — |
| `recurring[4].name` | costs.recurring | Primes assurance | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[5].category` | costs.recurring | frais_op | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[5].id` | costs.recurring | affilcf | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[5].monthly` | costs.recurring | 395 | medium | Devis / contrats fournisseurs | to-validate | — | n/a | none | — |
| `recurring[5].name` | costs.recurring | Affiliation CrossFit + Hyrox | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[6].category` | costs.recurring | frais_op | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[6].id` | costs.recurring | compta | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[6].monthly` | costs.recurring | 500 | medium | Devis / contrats fournisseurs | to-validate | — | n/a | none | — |
| `recurring[6].name` | costs.recurring | Honoraires comptable | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[7].category` | costs.recurring | frais_op | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[7].id` | costs.recurring | verisure | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[7].monthly` | costs.recurring | 170 | medium | Devis / contrats fournisseurs | to-validate | — | n/a | none | — |
| `recurring[7].name` | costs.recurring | Vérisure | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[8].category` | costs.recurring | frais_op | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[8].id` | costs.recurring | music | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[8].monthly` | costs.recurring | 35 | medium | Devis / contrats fournisseurs | to-validate | — | n/a | none | — |
| `recurring[8].name` | costs.recurring | Abonnement musique | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[9].category` | costs.recurring | frais_op | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[9].id` | costs.recurring | banque | unknown | Non documenté | unmapped | — | n/a | none | — |
| `recurring[9].monthly` | costs.recurring | 90 | medium | Devis / contrats fournisseurs | to-validate | — | n/a | none | — |
| `recurring[9].name` | costs.recurring | Frais bancaires | unknown | Non documenté | unmapped | — | n/a | none | — |
| `rent.monthlyByFy` | costs.rent | [10000, 18113, 12500, 12500, 12500, 12500, 12500] | critical | Bail commercial / LOI bailleur | missing | rentPerSqmParisYear: 350–700 | n/a | none | Tornado rent ±10%; Sensibilité ratio Y1→Y2 |
| `rent.monthlyCoopro` | costs.rent | 833 | medium | Charges copropriété immeuble | to-validate | — | n/a | none | — |
| `rent.yearlyTaxes` | costs.rent | 12 000 | medium | Taxe foncière / taxe ordures | to-validate | — | n/a | none | — |
| `salaries.annualIndexPa` | costs.salaries | 0 | high | SMIC + convention collective | to-validate | — | n/a | none | AUDIT-CORRECTED utilise 2% |
| `salaries.chargesPatroPct` | costs.salaries | 0 | critical | URSSAF — abrogé par category-based | validated | — | n/a | none | — |
| `salaries.freelancePools[0].hourlyRate` | costs.salaries | 25 | high | Marché coach freelance Paris | to-validate | — | n/a | none | — |
| `salaries.freelancePools[0].hoursPerWeekday` | costs.salaries | 8 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.freelancePools[0].hoursPerWeekendDay` | costs.salaries | 4 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.freelancePools[0].id` | costs.salaries | floor_cfrg | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.freelancePools[0].monthlyHours` | costs.salaries | 206.4 | critical | Planning horaire détaillé | to-validate | — | n/a | none | — |
| `salaries.freelancePools[0].name` | costs.salaries | Floor CFRG | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.freelancePools[1].hourlyRate` | costs.salaries | 25 | high | Marché coach freelance Paris | to-validate | — | n/a | none | — |
| `salaries.freelancePools[1].hoursPerWeekday` | costs.salaries | 6 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.freelancePools[1].hoursPerWeekendDay` | costs.salaries | 2 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.freelancePools[1].id` | costs.salaries | floor_hyrox | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.freelancePools[1].monthlyHours` | costs.salaries | 146.2 | critical | Planning horaire détaillé | to-validate | — | n/a | none | — |
| `salaries.freelancePools[1].name` | costs.salaries | Floor Hyrox | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.freelancePools[2].hourlyRate` | costs.salaries | 25 | high | Marché coach freelance Paris | to-validate | — | n/a | none | — |
| `salaries.freelancePools[2].hoursPerWeekday` | costs.salaries | 40.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.freelancePools[2].hoursPerWeekendDay` | costs.salaries | 20.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.freelancePools[2].id` | costs.salaries | floor_sandbox | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.freelancePools[2].monthlyHours` | costs.salaries | 10.32 | critical | Planning horaire détaillé | to-validate | — | n/a | none | — |
| `salaries.freelancePools[2].name` | costs.salaries | Floor sandbox | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.freelancePools[3].hourlyRate` | costs.salaries | 25 | high | Marché coach freelance Paris | to-validate | — | n/a | none | — |
| `salaries.freelancePools[3].id` | costs.salaries | cadre_coaching | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.freelancePools[3].monthlyHours` | costs.salaries | -43 | critical | Planning horaire détaillé | to-validate | — | n/a | none | — |
| `salaries.freelancePools[3].name` | costs.salaries | Cours inclus dans 2 headcoach cadre | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.freelancePools[4].hourlyRate` | costs.salaries | 20 | high | Marché coach freelance Paris | to-validate | — | n/a | none | — |
| `salaries.freelancePools[4].hoursPerWeekday` | costs.salaries | 8 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.freelancePools[4].hoursPerWeekendDay` | costs.salaries | 4 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.freelancePools[4].id` | costs.salaries | accueil | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.freelancePools[4].monthlyHours` | costs.salaries | 206.4 | critical | Planning horaire détaillé | to-validate | — | n/a | none | — |
| `salaries.freelancePools[4].name` | costs.salaries | Espace accueil | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.freelancePools[5].hourlyRate` | costs.salaries | 25 | high | Marché coach freelance Paris | to-validate | — | n/a | none | — |
| `salaries.freelancePools[5].id` | costs.salaries | entretiens_com | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.freelancePools[5].monthlyHours` | costs.salaries | 90 | critical | Planning horaire détaillé | to-validate | — | n/a | none | — |
| `salaries.freelancePools[5].name` | costs.salaries | Entretiens (commercial) | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.freelancePools[6].hourlyRate` | costs.salaries | 25 | high | Marché coach freelance Paris | to-validate | — | n/a | none | — |
| `salaries.freelancePools[6].id` | costs.salaries | cadre_entretiens | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.freelancePools[6].monthlyHours` | costs.salaries | -51.6 | critical | Planning horaire détaillé | to-validate | — | n/a | none | — |
| `salaries.freelancePools[6].name` | costs.salaries | Entretiens inclus dans 2 headcoach cadre | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.items[0].category` | costs.salaries | non-cadre | critical | Convention collective sport + statut associé | validated | — | n/a | none | — |
| `salaries.items[0].fte` | costs.salaries | 1 | high | Décision staffing | validated | — | n/a | none | — |
| `salaries.items[0].fy26Bump` | costs.salaries | 3 818 | high | Hypothèse rattrapage post-FY26 | to-validate | — | n/a | none | — |
| `salaries.items[0].id` | costs.salaries | salesmgr | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.items[0].monthlyGross` | costs.salaries | 3 300 | high | Marché salarial coach/manager Paris | to-validate | — | n/a | none | — |
| `salaries.items[0].role` | costs.salaries | Sales manager | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.items[0].startMonth` | costs.salaries | 0 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.items[1].category` | costs.salaries | non-cadre | critical | Convention collective sport + statut associé | validated | — | n/a | none | — |
| `salaries.items[1].fte` | costs.salaries | 2 | high | Décision staffing | validated | — | n/a | none | — |
| `salaries.items[1].fy26Bump` | costs.salaries | 4 240 | high | Hypothèse rattrapage post-FY26 | to-validate | — | n/a | none | — |
| `salaries.items[1].id` | costs.salaries | headcoach | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.items[1].monthlyGross` | costs.salaries | 3 300 | high | Marché salarial coach/manager Paris | to-validate | — | n/a | none | — |
| `salaries.items[1].role` | costs.salaries | Headcoach | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.items[1].startMonth` | costs.salaries | 0 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.items[2].category` | costs.salaries | tns | critical | Convention collective sport + statut associé | validated | — | n/a | none | — |
| `salaries.items[2].fte` | costs.salaries | 2 | high | Décision staffing | validated | — | n/a | none | — |
| `salaries.items[2].id` | costs.salaries | associes | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.items[2].monthlyGross` | costs.salaries | 3 300 | high | Marché salarial coach/manager Paris | to-validate | — | n/a | none | — |
| `salaries.items[2].role` | costs.salaries | Associés gérants | unknown | Non documenté | unmapped | — | n/a | none | — |
| `salaries.items[2].startMonth` | costs.salaries | 0 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.cacFitness.high` | benchmarks | 150 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.cacFitness.low` | benchmarks | 80 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.cacFitness.source` | benchmarks | Étude IHRSA 2023, secteur fitness FR | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.churnCrossfitCommunity.high` | benchmarks | 3.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.churnCrossfitCommunity.low` | benchmarks | 1.50% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.churnCrossfitCommunity.source` | benchmarks | CrossFit affiliate survey | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.churnFitnessChain.high` | benchmarks | 5.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.churnFitnessChain.low` | benchmarks | 3.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.churnFitnessChain.source` | benchmarks | IHRSA EU 2023 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.classCapacityCrossfit.high` | benchmarks | 16 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.classCapacityCrossfit.low` | benchmarks | 12 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.classCapacityCrossfit.source` | benchmarks | CrossFit HQ programming guidelines | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.ebitdaMarginCrossfit.high` | benchmarks | 25.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.ebitdaMarginCrossfit.low` | benchmarks | 15.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.ebitdaMarginCrossfit.source` | benchmarks | Étude Xerfi fitness FR 2023 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.ebitdaMarginGym.high` | benchmarks | 30.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.ebitdaMarginGym.low` | benchmarks | 20.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.ebitdaMarginGym.source` | benchmarks | Annual reports Basic Fit, Planet Fitness | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.isRateFR.high` | benchmarks | 25.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.isRateFR.low` | benchmarks | 15.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.isRateFR.source` | benchmarks | Code général des impôts FR | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.ltvCrossfitMonths.high` | benchmarks | 36 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.ltvCrossfitMonths.low` | benchmarks | 24 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.ltvCrossfitMonths.source` | benchmarks | Cohort retention CrossFit affiliates | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.membersMatureCrossfit.high` | benchmarks | 450 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.membersMatureCrossfit.low` | benchmarks | 250 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.membersMatureCrossfit.source` | benchmarks | CrossFit affiliate census 2023 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.monthlyPriceClassicGym.high` | benchmarks | 60 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.monthlyPriceClassicGym.low` | benchmarks | 30 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.monthlyPriceClassicGym.source` | benchmarks | Basic Fit, Neoness, On Air (catalogues 2024) | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.monthlyPriceCrossfit.high` | benchmarks | 220 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.monthlyPriceCrossfit.low` | benchmarks | 130 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.monthlyPriceCrossfit.source` | benchmarks | Reebok Crossfit Louvre, Train Yard, CrossFit RG (sites publics 2024) | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.multipleEbitdaFitness.high` | benchmarks | 6 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.multipleEbitdaFitness.low` | benchmarks | 4 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.multipleEbitdaFitness.source` | benchmarks | M&A studies: Pitchbook fitness 2023 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.rentPerSqmParisYear.high` | benchmarks | 700 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.rentPerSqmParisYear.low` | benchmarks | 350 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `sectorBenchmarks.rentPerSqmParisYear.source` | benchmarks | BNP Paribas Real Estate, indices 2024 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `stressScenarios` | stress | Array(5) | unknown | Non documenté | unmapped | — | n/a | none | — |
| `subs.growthRates` | revenue.subscriptions | [0.4, 0.3, 0.2, 0.15, 0.1, 0.08] | critical | Trajectoire ramp post-FY26 | to-validate | — | n/a | none | Tornado subsGrowth; Décomposer acquisition vs churn |
| `subs.monthlyChurnPct` | revenue.subscriptions | 0 | critical | À sourcer cohorte réelle | missing | churnCrossfitCommunity: 0.015–0.03 | below | none | Tornado churn 0→3%/mo; Reverse: churn max avant cashTrough<0 |
| `subs.priceIndexPa` | revenue.subscriptions | 0 | high | Décision pricing — inflation FR ~2% | to-validate | — | n/a | none | AUDIT-CORRECTED utilise 2% |
| `subs.rampEndCount` | revenue.subscriptions | 200 | critical | Cible interne fin FY26 | to-validate | — | n/a | none | Tornado ±20%; Calibrate vs Reebok Louvre Y1 réel |
| `subs.rampStartCount` | revenue.subscriptions | 80 | critical | Hypothèse pré-inscriptions M0 | missing | — | n/a | none | Reverse: ramp min pour break-even <24mo |
| `subs.seasonality` | revenue.subscriptions | [1.2, 1.05, 1, 0.85, 1.15, 1.05, 1, 0.95, 0.9, 0.8, 0.65, 0.6] | medium | Heuristique calendrier scolaire FR | to-validate | — | n/a | none | — |
| `subs.tiers[0].id` | revenue.subscriptions | ill2 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `subs.tiers[0].mixPct` | revenue.subscriptions | 10.00% | critical | Hypothèse fondateur basée sur historique legacy | to-validate | — | n/a | none | Tornado mixPremiumShift; Sensibilité ARPU pondéré |
| `subs.tiers[0].monthlyPrice` | revenue.subscriptions | 157.5 | critical | Tarifs catalogue CFRG (5 tiers abonnement) | to-validate | — | n/a | none | Tornado ±10%; Reverse: prix min pour cashTrough>0 |
| `subs.tiers[0].name` | revenue.subscriptions | Abo Illimité (2 séances/j) | unknown | Non documenté | unmapped | — | n/a | none | — |
| `subs.tiers[1].id` | revenue.subscriptions | ill1 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `subs.tiers[1].mixPct` | revenue.subscriptions | 40.00% | critical | Hypothèse fondateur basée sur historique legacy | to-validate | — | n/a | none | Tornado mixPremiumShift; Sensibilité ARPU pondéré |
| `subs.tiers[1].monthlyPrice` | revenue.subscriptions | 133.33 | critical | Tarifs catalogue CFRG (5 tiers abonnement) | to-validate | — | n/a | none | Tornado ±10%; Reverse: prix min pour cashTrough>0 |
| `subs.tiers[1].name` | revenue.subscriptions | Abo Illimité (1 séance/j) | unknown | Non documenté | unmapped | — | n/a | none | — |
| `subs.tiers[2].id` | revenue.subscriptions | s12 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `subs.tiers[2].mixPct` | revenue.subscriptions | 20.00% | critical | Hypothèse fondateur basée sur historique legacy | to-validate | — | n/a | none | Tornado mixPremiumShift; Sensibilité ARPU pondéré |
| `subs.tiers[2].monthlyPrice` | revenue.subscriptions | 116.67 | critical | Tarifs catalogue CFRG (5 tiers abonnement) | to-validate | — | n/a | none | Tornado ±10%; Reverse: prix min pour cashTrough>0 |
| `subs.tiers[2].name` | revenue.subscriptions | Abo 12 séances | unknown | Non documenté | unmapped | — | n/a | none | — |
| `subs.tiers[3].id` | revenue.subscriptions | s8 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `subs.tiers[3].mixPct` | revenue.subscriptions | 20.00% | critical | Hypothèse fondateur basée sur historique legacy | to-validate | — | n/a | none | Tornado mixPremiumShift; Sensibilité ARPU pondéré |
| `subs.tiers[3].monthlyPrice` | revenue.subscriptions | 100 | critical | Tarifs catalogue CFRG (5 tiers abonnement) | to-validate | — | n/a | none | Tornado ±10%; Reverse: prix min pour cashTrough>0 |
| `subs.tiers[3].name` | revenue.subscriptions | Abo 8 séances | unknown | Non documenté | unmapped | — | n/a | none | — |
| `subs.tiers[4].id` | revenue.subscriptions | s4 | unknown | Non documenté | unmapped | — | n/a | none | — |
| `subs.tiers[4].mixPct` | revenue.subscriptions | 10.00% | critical | Hypothèse fondateur basée sur historique legacy | to-validate | — | n/a | none | Tornado mixPremiumShift; Sensibilité ARPU pondéré |
| `subs.tiers[4].monthlyPrice` | revenue.subscriptions | 70.83 | critical | Tarifs catalogue CFRG (5 tiers abonnement) | to-validate | — | n/a | none | Tornado ±10%; Reverse: prix min pour cashTrough>0 |
| `subs.tiers[4].name` | revenue.subscriptions | Abo 4 séances | unknown | Non documenté | unmapped | — | n/a | none | — |
| `subs.vatRate` | revenue.subscriptions | 20.00% | high | Code général des impôts FR — TVA 20% | validated | — | n/a | none | — |
| `tax.amortYearsEquipment` | tax | 5 | medium | PCG — équipement sportif 5-10 ans | validated | — | n/a | none | — |
| `tax.amortYearsTravaux` | tax | 10 | medium | PCG — agencement 10-20 ans | validated | — | n/a | none | — |
| `tax.daYears` | tax | 5 | medium | Plan comptable général | validated | — | n/a | none | — |
| `tax.enableDA` | tax | false | critical | Décision modèle | to-validate | — | n/a | none | — |
| `tax.enableIs` | tax | false | critical | Décision modèle | to-validate | — | n/a | none | — |
| `tax.isRate` | tax | 25.00% | high | CGI 2026 — IS 25% (15% jusque 42500€) | validated | isRateFR: 0.15–0.25 | in-range | none | — |
| `tax.vatDeductibleOpexPct` | tax | 50.00% | unknown | Non documenté | unmapped | — | n/a | none | — |
| `timeline.horizonYears` | timeline | 7 | low | Pratique BP startup pré-Series A: 5-7 ans | validated | — | n/a | none | — |
| `timeline.startYear` | timeline | 2 026 | high | Décision projet — ouverture Sept 2026 | validated | — | n/a | none | Retard ouverture 3/6 mois via openingDelay driver |

---

## Gap-list — paramètres à traiter en priorité

### 1. Critiques sans validation 4-eyes

- `bfr.daysOfRevenue` = 0 — 0j dans DEFAULT_PARAMS = irréaliste. AUDIT-CORRECTED: 15j.
- `capex.equipment` = 74 252 — 74k€ équipement = base amortissable 5y. Devis fournisseurs requis.
- `capex.travaux` = 100 000 — 100k€ travaux — risque dérapage. Devis multiples + contingency.
- `financing.bonds[0].annualRatePct` = 6 — 6% PME pré-CA = bas. 8-10% plus réaliste.
- `financing.bonds[0].capitalizeInterest` = true — PIK soulage cash mais explose notional final.
- `financing.bonds[0].deferralYears` = 2 — (rationale manquant)
- `financing.bonds[0].principal` = 200 000 — 200k€ bond — souscripteurs identifiés requis.
- `financing.equity[0].amount` = 100 000 — 400k€ equity dont 100k perso. À matérialiser (term sheet, virement).
- `financing.equity[1].amount` = 300 000 — 400k€ equity dont 100k perso. À matérialiser (term sheet, virement).
- `financing.loans[0].annualRatePct` = 3 — 3% taux 2026 = optimiste sur BCE. 4-5% plus défendable.
- `financing.loans[0].principal` = 200 000 — 200k€ emprunt — accord bancaire signé ou LOI requise.
- `legacy.avgMonthlyPrice` = 120.83 — (rationale manquant)
- `legacy.startCount` = 220 — 220 membres legacy = atout de demande validée mais churn impact direct.
- `marketing.monthlyBudget` = 2 700 — Budget marketing mensuel fixe. CAC implicite = budget Y1 / new members Y1.
- `marketing.pctOfRevenue` = 0 — Mix fixe vs %CA. AUDIT-CORRECTED utilise 2% CA.
- `openingCash` = 0 — 0 = financement couvre 100% du démarrage. Réserve fondateur ?
- `rent.monthlyByFy` = [10000, 18113, 12500, 12500, 12500, 12500, 12500] — Saut FY26→FY27 (10000→18113) atypique. LOI/bail requis.
- `salaries.annualIndexPa` = 0 — SMIC indexé chaque année. 0% interdit légalement, +2% défendable.
- `salaries.chargesPatroPct` = 0 — Fallback global. La logique réelle utilise `chargesProfiles` par catégorie.
- `salaries.freelancePools[0].hourlyRate` = 25 — 25€/h floor coach = mid-market. Sandboxs/Hyrox: à vérifier.
- `salaries.freelancePools[0].monthlyHours` = 206.4 — Heures × taux = masse freelance, second poste coût après salariés.
- `salaries.freelancePools[1].hourlyRate` = 25 — 25€/h floor coach = mid-market. Sandboxs/Hyrox: à vérifier.
- `salaries.freelancePools[1].monthlyHours` = 146.2 — Heures × taux = masse freelance, second poste coût après salariés.
- `salaries.freelancePools[2].hourlyRate` = 25 — 25€/h floor coach = mid-market. Sandboxs/Hyrox: à vérifier.
- `salaries.freelancePools[2].monthlyHours` = 10.32 — Heures × taux = masse freelance, second poste coût après salariés.
- `salaries.freelancePools[3].hourlyRate` = 25 — 25€/h floor coach = mid-market. Sandboxs/Hyrox: à vérifier.
- `salaries.freelancePools[3].monthlyHours` = -43 — Heures × taux = masse freelance, second poste coût après salariés.
- `salaries.freelancePools[4].hourlyRate` = 20 — 25€/h floor coach = mid-market. Sandboxs/Hyrox: à vérifier.
- `salaries.freelancePools[4].monthlyHours` = 206.4 — Heures × taux = masse freelance, second poste coût après salariés.
- `salaries.freelancePools[5].hourlyRate` = 25 — 25€/h floor coach = mid-market. Sandboxs/Hyrox: à vérifier.
- `salaries.freelancePools[5].monthlyHours` = 90 — Heures × taux = masse freelance, second poste coût après salariés.
- `salaries.freelancePools[6].hourlyRate` = 25 — 25€/h floor coach = mid-market. Sandboxs/Hyrox: à vérifier.
- `salaries.freelancePools[6].monthlyHours` = -51.6 — Heures × taux = masse freelance, second poste coût après salariés.
- `salaries.items[0].category` = non-cadre — Détermine charges patronales (cadre 42%, non-cadre 40%, TNS 45%).
- `salaries.items[0].fte` = 1 — (rationale manquant)
- `salaries.items[0].fy26Bump` = 3 818 — (rationale manquant)
- `salaries.items[0].monthlyGross` = 3 300 — Coach CrossFit Paris: 2200-3500€ brut. Sales manager: 3000-4500€.
- `salaries.items[1].category` = non-cadre — Détermine charges patronales (cadre 42%, non-cadre 40%, TNS 45%).
- `salaries.items[1].fte` = 2 — (rationale manquant)
- `salaries.items[1].fy26Bump` = 4 240 — (rationale manquant)
- `salaries.items[1].monthlyGross` = 3 300 — Coach CrossFit Paris: 2200-3500€ brut. Sales manager: 3000-4500€.
- `salaries.items[2].category` = tns — Détermine charges patronales (cadre 42%, non-cadre 40%, TNS 45%).
- `salaries.items[2].fte` = 2 — (rationale manquant)
- `salaries.items[2].monthlyGross` = 3 300 — Coach CrossFit Paris: 2200-3500€ brut. Sales manager: 3000-4500€.
- `subs.growthRates` = [0.4, 0.3, 0.2, 0.15, 0.1, 0.08] — Croissance YoY combinée à churn doit rester cohérente (pas magic growth).
- `subs.monthlyChurnPct` = 0 — Churn=0 = kill VC. Cible défendable: 1.5-3%/mo.
- `subs.priceIndexPa` = 0 — Geler prix nominal = baisse prix réel ~15% horizon 7y. À justifier.
- `subs.rampEndCount` = 200 — 200 fin M12 = ramp Y1 ambitieux. Boxes parisiennes atteignent 250-450 en 18-36 mo, pas 12.
- `subs.rampStartCount` = 80 — Effectif M0. 80 membres dès ouverture = signal demande contractualisé requis (LOI, dépôts pré-inscription).
- `subs.tiers[0].mixPct` = 10.00% — Mix tier détermine ARPU. Bascule premium → cheap = -15-20% revenu.
- `subs.tiers[0].monthlyPrice` = 157.5 — Prix de chaque tier. Le contrôle benchmark se fait sur ARPU pondéré (cf agrégats).
- `subs.tiers[1].mixPct` = 40.00% — Mix tier détermine ARPU. Bascule premium → cheap = -15-20% revenu.
- `subs.tiers[1].monthlyPrice` = 133.33 — Prix de chaque tier. Le contrôle benchmark se fait sur ARPU pondéré (cf agrégats).
- `subs.tiers[2].mixPct` = 20.00% — Mix tier détermine ARPU. Bascule premium → cheap = -15-20% revenu.
- `subs.tiers[2].monthlyPrice` = 116.67 — Prix de chaque tier. Le contrôle benchmark se fait sur ARPU pondéré (cf agrégats).
- `subs.tiers[3].mixPct` = 20.00% — Mix tier détermine ARPU. Bascule premium → cheap = -15-20% revenu.
- `subs.tiers[3].monthlyPrice` = 100 — Prix de chaque tier. Le contrôle benchmark se fait sur ARPU pondéré (cf agrégats).
- `subs.tiers[4].mixPct` = 10.00% — Mix tier détermine ARPU. Bascule premium → cheap = -15-20% revenu.
- `subs.tiers[4].monthlyPrice` = 70.83 — Prix de chaque tier. Le contrôle benchmark se fait sur ARPU pondéré (cf agrégats).
- `subs.vatRate` = 20.00% — TVA 20% standard prestations sportives non éligibles taux réduit.
- `tax.enableDA` = false — false = pas d'amortissement = P&L surévalué.
- `tax.enableIs` = false — false dans DEFAULT_PARAMS = bug audit. AUDIT-CORRECTED active.
- `tax.isRate` = 25.00% — (rationale manquant)
- `timeline.startYear` = 2 026 — Premier mois P&L = Sept 2026. Tout retard décale break-even.

### 2. Paramètres sans source

- `auditThresholds.bfrCriticalDays` = 180 (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.bfrWarnDays` = 90 (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.bondDeferralMinYears` = 2 (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.capacityAlertSaturation` = 95.00% (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.capacityCriticalSaturation` = 1 (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.cashBufferThinEur` = 50 000 (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.cashThinHealthEur` = 10 000 (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.cashThinSynthesisEur` = 50 000 (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.churnKillLevel` = 0 (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.churnMajorThreshold` = 1.50% (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.daThresholdCapex` = 50 000 (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.debtRatioMax` = 50.00% (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.dscrGoodThreshold` = 1.2 (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.dscrLimitThreshold` = 1 (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.ebitdaMarginAlertNeg` = -10.00% (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.founderMinPct` = 60.00% (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.growthMagicChurn` = 2.00% (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.growthMagicYoy` = 30.00% (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.irrGoodThreshold` = 15.00% (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.isThresholdNetIncome` = 50 000 (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.loanRateMaxPlausiblePct` = 30 (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.ltvCacGoodThreshold` = 3 (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.ltvCacMin` = 3 (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.ltvCacWarnThreshold` = 1 (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.rentJumpRatio` = 1.3 (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.salaryPctHighThreshold` = 50.00% (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.salaryPctMediumThreshold` = 35.00% (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.verdictKillMinCount` = 1 (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.verdictMajorBlockingCount` = 4 (catégorie thresholds.audit, criticité unknown)
- `auditThresholds.verdictMajorWarnCount` = 1 (catégorie thresholds.audit, criticité unknown)
- `capacityHeuristics.coachHoursPerFteMonth` = 130 (catégorie heuristics, criticité unknown)
- `capacityHeuristics.cohortShareLong` = 40.00% (catégorie heuristics, criticité unknown)
- `capacityHeuristics.cohortShareMid` = 35.00% (catégorie heuristics, criticité unknown)
- `capacityHeuristics.cohortShareNew` = 25.00% (catégorie heuristics, criticité unknown)
- `capacityHeuristics.expectedFillRate` = 70.00% (catégorie heuristics, criticité unknown)
- `capacityHeuristics.memberHoursDemandPerMonth` = 12 (catégorie heuristics, criticité unknown)
- `capacityHeuristics.overflowSaturation` = 1.5 (catégorie heuristics, criticité unknown)
- `capacityHeuristics.peakRatioThreshold` = 40.00% (catégorie heuristics, criticité unknown)
- `capacityHeuristics.productiveRatio` = 90.00% (catégorie heuristics, criticité unknown)
- `capacityHeuristics.targetSaturationDefault` = 75.00% (catégorie heuristics, criticité unknown)
- `financing.bonds[0].amortization` = bullet (catégorie financing.bonds, criticité unknown)
- `financing.bonds[0].frequency` = 1 (catégorie financing.bonds, criticité unknown)
- `financing.bonds[0].id` = bond_1 (catégorie financing.bonds, criticité unknown)
- `financing.bonds[0].name` = Obligation non convertible (in fine, différé capitalisé) (catégorie financing.bonds, criticité unknown)
- `financing.bonds[0].principal` = 200 000 (catégorie financing.bonds, criticité critical)
- `financing.bonds[0].startMonth` = 0 (catégorie financing.bonds, criticité unknown)
- `financing.bonds[0].termYears` = 5 (catégorie financing.bonds, criticité unknown)
- `financing.equity[0].id` = apport_perso (catégorie financing.equity, criticité unknown)
- `financing.equity[0].name` = Apport personnel (catégorie financing.equity, criticité unknown)
- `financing.equity[0].startMonth` = 0 (catégorie financing.equity, criticité unknown)
- `financing.equity[1].id` = levee (catégorie financing.equity, criticité unknown)
- `financing.equity[1].name` = Levée de fonds (associés/investisseurs) (catégorie financing.equity, criticité unknown)
- `financing.equity[1].startMonth` = 0 (catégorie financing.equity, criticité unknown)
- `financing.loans[0].id` = loan_bank (catégorie financing.loans, criticité unknown)
- `financing.loans[0].name` = Emprunt bancaire (catégorie financing.loans, criticité unknown)
- `financing.loans[0].principal` = 200 000 (catégorie financing.loans, criticité critical)
- `financing.loans[0].startMonth` = 0 (catégorie financing.loans, criticité unknown)
- `investorAssumptions.discountRate` = 10.00% (catégorie thresholds.investor, criticité unknown)
- `investorAssumptions.exitMultipleEbitda` = 5 (catégorie thresholds.investor, criticité unknown)
- `investorAssumptions.retentionMonthsFallback` = 24 (catégorie thresholds.investor, criticité unknown)
- `legacy.yearlyChurnAbs` = 24 (catégorie revenue.legacy, criticité medium)
- `mcDefaults.distribution` = uniform (catégorie montecarlo, criticité unknown)
- `mcDefaults.enableCorrelation` = true (catégorie montecarlo, criticité unknown)
- `mcDefaults.maxOpeningDelayMonths` = 6 (catégorie montecarlo, criticité unknown)
- `merch.growthPa` = 0 (catégorie revenue.merch, criticité unknown)
- `merch.monthlyMargin` = 351 (catégorie revenue.merch, criticité unknown)
- `oneOffs[0].id` = sacem (catégorie costs.oneoff, criticité unknown)
- `oneOffs[0].month` = 9 (catégorie costs.oneoff, criticité unknown)
- `oneOffs[0].name` = SACEM (catégorie costs.oneoff, criticité unknown)
- `oneOffs[0].yearly` = true (catégorie costs.oneoff, criticité unknown)
- `oneOffs[1].id` = doc (catégorie costs.oneoff, criticité unknown)
- `oneOffs[1].month` = 5 (catégorie costs.oneoff, criticité unknown)
- `oneOffs[1].name` = Documentation (catégorie costs.oneoff, criticité unknown)
- `oneOffs[1].yearly` = true (catégorie costs.oneoff, criticité unknown)
- `oneOffs[2].id` = extincteurs (catégorie costs.oneoff, criticité unknown)
- `oneOffs[2].month` = 0 (catégorie costs.oneoff, criticité unknown)
- `oneOffs[2].name` = Extincteurs (catégorie costs.oneoff, criticité unknown)
- `oneOffs[2].yearly` = true (catégorie costs.oneoff, criticité unknown)
- `oneOffs[3].id` = defib (catégorie costs.oneoff, criticité unknown)
- `oneOffs[3].month` = 0 (catégorie costs.oneoff, criticité unknown)
- `oneOffs[3].name` = Défibrillateur (catégorie costs.oneoff, criticité unknown)
- `oneOffs[3].yearly` = true (catégorie costs.oneoff, criticité unknown)
- `prestations.horsAbo.growthPa` = 5.00% (catégorie revenue.prestations, criticité unknown)
- `prestations.horsAbo.monthlyAvg` = 4 166 (catégorie revenue.prestations, criticité unknown)
- `prestations.senior.growthPa` = 10.00% (catégorie revenue.prestations, criticité unknown)
- `prestations.senior.price` = 33.33 (catégorie revenue.prestations, criticité unknown)
- `prestations.senior.startCount` = 10 (catégorie revenue.prestations, criticité unknown)
- `prestations.teen.growthPa` = 10.00% (catégorie revenue.prestations, criticité unknown)
- `prestations.teen.price` = 41.67 (catégorie revenue.prestations, criticité unknown)
- `prestations.teen.startCount` = 10 (catégorie revenue.prestations, criticité unknown)
- `provisions.indexPa` = 0 (catégorie costs.provisions, criticité unknown)
- `recurring[0].category` = entretien (catégorie costs.recurring, criticité unknown)
- `recurring[0].id` = elec (catégorie costs.recurring, criticité unknown)
- `recurring[0].name` = Électricité (catégorie costs.recurring, criticité unknown)
- `recurring[1].category` = entretien (catégorie costs.recurring, criticité unknown)
- `recurring[1].id` = eau (catégorie costs.recurring, criticité unknown)
- `recurring[1].name` = Eau (catégorie costs.recurring, criticité unknown)
- `recurring[10].category` = frais_op (catégorie costs.recurring, criticité unknown)
- `recurring[10].id` = tel (catégorie costs.recurring, criticité unknown)
- `recurring[10].name` = Téléphone, Internet (catégorie costs.recurring, criticité unknown)
- `recurring[2].category` = entretien (catégorie costs.recurring, criticité unknown)
- `recurring[2].id` = menage (catégorie costs.recurring, criticité unknown)
- `recurring[2].name` = Société de Ménage (catégorie costs.recurring, criticité unknown)
- `recurring[3].category` = frais_op (catégorie costs.recurring, criticité unknown)
- `recurring[3].id` = assu (catégorie costs.recurring, criticité unknown)
- `recurring[3].name` = Assurance (catégorie costs.recurring, criticité unknown)
- `recurring[4].category` = frais_op (catégorie costs.recurring, criticité unknown)
- `recurring[4].id` = primesassu (catégorie costs.recurring, criticité unknown)
- `recurring[4].name` = Primes assurance (catégorie costs.recurring, criticité unknown)
- `recurring[5].category` = frais_op (catégorie costs.recurring, criticité unknown)
- `recurring[5].id` = affilcf (catégorie costs.recurring, criticité unknown)
- `recurring[5].name` = Affiliation CrossFit + Hyrox (catégorie costs.recurring, criticité unknown)
- `recurring[6].category` = frais_op (catégorie costs.recurring, criticité unknown)
- `recurring[6].id` = compta (catégorie costs.recurring, criticité unknown)
- `recurring[6].name` = Honoraires comptable (catégorie costs.recurring, criticité unknown)
- `recurring[7].category` = frais_op (catégorie costs.recurring, criticité unknown)
- `recurring[7].id` = verisure (catégorie costs.recurring, criticité unknown)
- `recurring[7].name` = Vérisure (catégorie costs.recurring, criticité unknown)
- `recurring[8].category` = frais_op (catégorie costs.recurring, criticité unknown)
- `recurring[8].id` = music (catégorie costs.recurring, criticité unknown)
- `recurring[8].name` = Abonnement musique (catégorie costs.recurring, criticité unknown)
- `recurring[9].category` = frais_op (catégorie costs.recurring, criticité unknown)
- `recurring[9].id` = banque (catégorie costs.recurring, criticité unknown)
- `recurring[9].name` = Frais bancaires (catégorie costs.recurring, criticité unknown)
- `rent.monthlyByFy` = [10000, 18113, 12500, 12500, 12500, 12500, 12500] (catégorie costs.rent, criticité critical)
- `salaries.freelancePools[0].hoursPerWeekday` = 8 (catégorie costs.salaries, criticité unknown)
- `salaries.freelancePools[0].hoursPerWeekendDay` = 4 (catégorie costs.salaries, criticité unknown)
- `salaries.freelancePools[0].id` = floor_cfrg (catégorie costs.salaries, criticité unknown)
- `salaries.freelancePools[0].name` = Floor CFRG (catégorie costs.salaries, criticité unknown)
- `salaries.freelancePools[1].hoursPerWeekday` = 6 (catégorie costs.salaries, criticité unknown)
- `salaries.freelancePools[1].hoursPerWeekendDay` = 2 (catégorie costs.salaries, criticité unknown)
- `salaries.freelancePools[1].id` = floor_hyrox (catégorie costs.salaries, criticité unknown)
- `salaries.freelancePools[1].name` = Floor Hyrox (catégorie costs.salaries, criticité unknown)
- `salaries.freelancePools[2].hoursPerWeekday` = 40.00% (catégorie costs.salaries, criticité unknown)
- `salaries.freelancePools[2].hoursPerWeekendDay` = 20.00% (catégorie costs.salaries, criticité unknown)
- `salaries.freelancePools[2].id` = floor_sandbox (catégorie costs.salaries, criticité unknown)
- `salaries.freelancePools[2].name` = Floor sandbox (catégorie costs.salaries, criticité unknown)
- `salaries.freelancePools[3].id` = cadre_coaching (catégorie costs.salaries, criticité unknown)
- `salaries.freelancePools[3].name` = Cours inclus dans 2 headcoach cadre (catégorie costs.salaries, criticité unknown)
- `salaries.freelancePools[4].hoursPerWeekday` = 8 (catégorie costs.salaries, criticité unknown)
- `salaries.freelancePools[4].hoursPerWeekendDay` = 4 (catégorie costs.salaries, criticité unknown)
- `salaries.freelancePools[4].id` = accueil (catégorie costs.salaries, criticité unknown)
- `salaries.freelancePools[4].name` = Espace accueil (catégorie costs.salaries, criticité unknown)
- `salaries.freelancePools[5].id` = entretiens_com (catégorie costs.salaries, criticité unknown)
- `salaries.freelancePools[5].name` = Entretiens (commercial) (catégorie costs.salaries, criticité unknown)
- `salaries.freelancePools[6].id` = cadre_entretiens (catégorie costs.salaries, criticité unknown)
- `salaries.freelancePools[6].name` = Entretiens inclus dans 2 headcoach cadre (catégorie costs.salaries, criticité unknown)
- `salaries.items[0].id` = salesmgr (catégorie costs.salaries, criticité unknown)
- `salaries.items[0].role` = Sales manager (catégorie costs.salaries, criticité unknown)
- `salaries.items[0].startMonth` = 0 (catégorie costs.salaries, criticité unknown)
- `salaries.items[1].id` = headcoach (catégorie costs.salaries, criticité unknown)
- `salaries.items[1].role` = Headcoach (catégorie costs.salaries, criticité unknown)
- `salaries.items[1].startMonth` = 0 (catégorie costs.salaries, criticité unknown)
- `salaries.items[2].id` = associes (catégorie costs.salaries, criticité unknown)
- `salaries.items[2].role` = Associés gérants (catégorie costs.salaries, criticité unknown)
- `salaries.items[2].startMonth` = 0 (catégorie costs.salaries, criticité unknown)
- `sectorBenchmarks.cacFitness.high` = 150 (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.cacFitness.low` = 80 (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.cacFitness.source` = Étude IHRSA 2023, secteur fitness FR (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.churnCrossfitCommunity.high` = 3.00% (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.churnCrossfitCommunity.low` = 1.50% (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.churnCrossfitCommunity.source` = CrossFit affiliate survey (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.churnFitnessChain.high` = 5.00% (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.churnFitnessChain.low` = 3.00% (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.churnFitnessChain.source` = IHRSA EU 2023 (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.classCapacityCrossfit.high` = 16 (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.classCapacityCrossfit.low` = 12 (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.classCapacityCrossfit.source` = CrossFit HQ programming guidelines (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.ebitdaMarginCrossfit.high` = 25.00% (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.ebitdaMarginCrossfit.low` = 15.00% (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.ebitdaMarginCrossfit.source` = Étude Xerfi fitness FR 2023 (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.ebitdaMarginGym.high` = 30.00% (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.ebitdaMarginGym.low` = 20.00% (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.ebitdaMarginGym.source` = Annual reports Basic Fit, Planet Fitness (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.isRateFR.high` = 25.00% (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.isRateFR.low` = 15.00% (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.isRateFR.source` = Code général des impôts FR (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.ltvCrossfitMonths.high` = 36 (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.ltvCrossfitMonths.low` = 24 (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.ltvCrossfitMonths.source` = Cohort retention CrossFit affiliates (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.membersMatureCrossfit.high` = 450 (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.membersMatureCrossfit.low` = 250 (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.membersMatureCrossfit.source` = CrossFit affiliate census 2023 (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.monthlyPriceClassicGym.high` = 60 (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.monthlyPriceClassicGym.low` = 30 (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.monthlyPriceClassicGym.source` = Basic Fit, Neoness, On Air (catalogues 2024) (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.monthlyPriceCrossfit.high` = 220 (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.monthlyPriceCrossfit.low` = 130 (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.monthlyPriceCrossfit.source` = Reebok Crossfit Louvre, Train Yard, CrossFit RG (sites publics 2024) (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.multipleEbitdaFitness.high` = 6 (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.multipleEbitdaFitness.low` = 4 (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.multipleEbitdaFitness.source` = M&A studies: Pitchbook fitness 2023 (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.rentPerSqmParisYear.high` = 700 (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.rentPerSqmParisYear.low` = 350 (catégorie benchmarks, criticité unknown)
- `sectorBenchmarks.rentPerSqmParisYear.source` = BNP Paribas Real Estate, indices 2024 (catégorie benchmarks, criticité unknown)
- `stressScenarios` = Array(5) (catégorie stress, criticité unknown)
- `subs.monthlyChurnPct` = 0 (catégorie revenue.subscriptions, criticité critical)
- `subs.rampStartCount` = 80 (catégorie revenue.subscriptions, criticité critical)
- `subs.tiers[0].id` = ill2 (catégorie revenue.subscriptions, criticité unknown)
- `subs.tiers[0].name` = Abo Illimité (2 séances/j) (catégorie revenue.subscriptions, criticité unknown)
- `subs.tiers[1].id` = ill1 (catégorie revenue.subscriptions, criticité unknown)
- `subs.tiers[1].name` = Abo Illimité (1 séance/j) (catégorie revenue.subscriptions, criticité unknown)
- `subs.tiers[2].id` = s12 (catégorie revenue.subscriptions, criticité unknown)
- `subs.tiers[2].name` = Abo 12 séances (catégorie revenue.subscriptions, criticité unknown)
- `subs.tiers[3].id` = s8 (catégorie revenue.subscriptions, criticité unknown)
- `subs.tiers[3].name` = Abo 8 séances (catégorie revenue.subscriptions, criticité unknown)
- `subs.tiers[4].id` = s4 (catégorie revenue.subscriptions, criticité unknown)
- `subs.tiers[4].name` = Abo 4 séances (catégorie revenue.subscriptions, criticité unknown)
- `tax.vatDeductibleOpexPct` = 50.00% (catégorie tax, criticité unknown)

### 3. Hors benchmark sectoriel

- `subs.monthlyChurnPct` = 0 below range 0.015–0.03 (CrossFit affiliate survey)
