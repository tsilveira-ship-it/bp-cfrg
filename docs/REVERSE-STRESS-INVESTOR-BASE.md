# Reverse stress test — INVESTOR_BASE

> Généré: 2026-05-12T11:26:15.894Z
> 15 drivers × 4 métriques = 60 bisections

## Fragilités prioritaires (marge < 10%)

| Driver | Métrique | Valeur actuelle | Valeur rupture | Marge | Verdict |
|--------|----------|-----------------|----------------|-------|---------|
| Churn mensuel global | DSCR min annuel ≥ 1 (post période grâce) | 2.00% | — | 0% | 💀 déjà cassé |
| Ramp fin M12 (rampEndCount) | DSCR min annuel ≥ 1 (post période grâce) | 260.000 membres | — | 0% | 💀 déjà cassé |
| Ramp M0 (rampStartCount) | DSCR min annuel ≥ 1 (post période grâce) | 60.000 membres | — | 0% | 💀 déjà cassé |
| Croissance YoY (multiplicateur global) | DSCR min annuel ≥ 1 (post période grâce) | 1.000 × growthRates | — | 0% | 💀 déjà cassé |
| ARPU (multiplicateur global prix tiers) | DSCR min annuel ≥ 1 (post période grâce) | 1.000 × prix | — | 0% | 💀 déjà cassé |
| Indexation prix annuelle | DSCR min annuel ≥ 1 (post période grâce) | 2.00% | — | 0% | 💀 déjà cassé |
| Masse salariale (multiplicateur) | DSCR min annuel ≥ 1 (post période grâce) | 1.000 × salaires | — | 0% | 💀 déjà cassé |
| Indexation salaires annuelle | DSCR min annuel ≥ 1 (post période grâce) | 2.00% | — | 0% | 💀 déjà cassé |
| Charges patronales (fallback global) | DSCR min annuel ≥ 1 (post période grâce) | 0.00% | — | 0% | 💀 déjà cassé |
| Loyer (multiplicateur tous FY) | DSCR min annuel ≥ 1 (post période grâce) | 1.000 × loyer | — | 0% | 💀 déjà cassé |
| CAPEX total (multiplicateur) | DSCR min annuel ≥ 1 (post période grâce) | 1.000 × CAPEX | — | 0% | 💀 déjà cassé |
| Taux emprunts bancaires (annuel) | DSCR min annuel ≥ 1 (post période grâce) | 4.000 % annuel | — | 0% | 💀 déjà cassé |
| Taux obligations (annuel) | DSCR min annuel ≥ 1 (post période grâce) | 8.000 % annuel | — | 0% | 💀 déjà cassé |
| Taux IS | DSCR min annuel ≥ 1 (post période grâce) | 25.00% | — | 0% | 💀 déjà cassé |
| Retard d'ouverture (mois) | DSCR min annuel ≥ 1 (post période grâce) | 0.000 mois | — | 0% | 💀 déjà cassé |
| ARPU (multiplicateur global prix tiers) | Trésorerie creux ≥ 0 | 1.000 × prix | 0.954 × prix | 5% | 🔴 fragile |
| Ramp fin M12 (rampEndCount) | Trésorerie creux ≥ 0 | 260.000 membres | 247.736 membres | 5% | 🔴 fragile |
| Masse salariale (multiplicateur) | Trésorerie creux ≥ 0 | 1.000 × salaires | 1.079 × salaires | 8% | 🔴 fragile |

## Tableau complet — marge de sécurité par driver × métrique

### Marge relative à la rupture (% ou ratio)

| Driver | Trésorerie creux ≥ 0 | Break-even atteint dans l'horizon | EBITDA dernier FY ≥ 0 | DSCR min annuel ≥ 1 (post période grâce) |
|---|---|---|---|---|
| Churn mensuel global | 900% 🟢 robuste | 900% 🟢 robuste | 900% 🟢 robuste | 0% 💀 déjà cassé |
| Ramp fin M12 (rampEndCount) | 5% 🔴 fragile | 34% 🟢 robuste | 14% 🟡 moyen | 0% 💀 déjà cassé |
| Ramp M0 (rampStartCount) | 100% 🟢 robuste | 100% 🟢 robuste | 100% 🟢 robuste | 0% 💀 déjà cassé |
| Croissance YoY (multiplicateur global) | 12% 🟡 moyen | 67% 🟢 robuste | 21% 🟡 moyen | 0% 💀 déjà cassé |
| ARPU (multiplicateur global prix tiers) | 5% 🔴 fragile | 34% 🟢 robuste | 14% 🟡 moyen | 0% 💀 déjà cassé |
| Indexation prix annuelle | 93% 🟢 robuste | 490% 🟢 robuste | 123% 🟢 robuste | 0% 💀 déjà cassé |
| Masse salariale (multiplicateur) | 8% 🔴 fragile | 115% 🟢 robuste | 36% 🟢 robuste | 0% 💀 déjà cassé |
| Indexation salaires annuelle | 160% 🟢 robuste | 650% 🟢 robuste | 194% 🟢 robuste | 0% 💀 déjà cassé |
| Charges patronales (fallback global) | — 🟢 robuste | — 🟢 robuste | — 🟢 robuste | 0% 💀 déjà cassé |
| Loyer (multiplicateur tous FY) | 15% 🟡 moyen | 100% 🟢 robuste | 72% 🟢 robuste | 0% 💀 déjà cassé |
| CAPEX total (multiplicateur) | 40% 🟢 robuste | 200% 🟢 robuste | 200% 🟢 robuste | 0% 💀 déjà cassé |
| Taux emprunts bancaires (annuel) | 400% 🟢 robuste | 400% 🟢 robuste | 400% 🟢 robuste | 0% 💀 déjà cassé |
| Taux obligations (annuel) | 102% 🟢 robuste | 150% 🟢 robuste | 150% 🟢 robuste | 0% 💀 déjà cassé |
| Taux IS | 60% 🟢 robuste | 60% 🟢 robuste | 60% 🟢 robuste | 0% 💀 déjà cassé |
| Retard d'ouverture (mois) | — — | — — | — — | 0% 💀 déjà cassé |

### Détail valeurs rupture

| Driver | Direction | Métrique | Courant | Rupture | Marge abs | Marge % | Statut | Iter |
|--------|-----------|----------|---------|---------|-----------|---------|--------|------|
| Churn mensuel global | higher-is-worse | Trésorerie creux ≥ 0 | 2.00% | 20.00% | 18.00% | 900% | no-break-in-bounds | 1 |
| Churn mensuel global | higher-is-worse | Break-even atteint dans l'horizon | 2.00% | 20.00% | 18.00% | 900% | no-break-in-bounds | 1 |
| Churn mensuel global | higher-is-worse | EBITDA dernier FY ≥ 0 | 2.00% | 20.00% | 18.00% | 900% | no-break-in-bounds | 1 |
| Churn mensuel global | higher-is-worse | DSCR min annuel ≥ 1 (post période grâce) | 2.00% | — | 0.00% | 0% | already-broken | 0 |
| Ramp fin M12 (rampEndCount) | lower-is-worse | Trésorerie creux ≥ 0 | 260.000 membres | 247.736 membres | -12.264 membres | 5% | found | 22 |
| Ramp fin M12 (rampEndCount) | lower-is-worse | Break-even atteint dans l'horizon | 260.000 membres | 170.720 membres | -89.280 membres | 34% | found | 22 |
| Ramp fin M12 (rampEndCount) | lower-is-worse | EBITDA dernier FY ≥ 0 | 260.000 membres | 224.539 membres | -35.461 membres | 14% | found | 22 |
| Ramp fin M12 (rampEndCount) | lower-is-worse | DSCR min annuel ≥ 1 (post période grâce) | 260.000 membres | — | 0.000 membres | 0% | already-broken | 0 |
| Ramp M0 (rampStartCount) | lower-is-worse | Trésorerie creux ≥ 0 | 60.000 membres | 0.000 membres | -60.000 membres | 100% | no-break-in-bounds | 1 |
| Ramp M0 (rampStartCount) | lower-is-worse | Break-even atteint dans l'horizon | 60.000 membres | 0.000 membres | -60.000 membres | 100% | no-break-in-bounds | 1 |
| Ramp M0 (rampStartCount) | lower-is-worse | EBITDA dernier FY ≥ 0 | 60.000 membres | 0.000 membres | -60.000 membres | 100% | no-break-in-bounds | 1 |
| Ramp M0 (rampStartCount) | lower-is-worse | DSCR min annuel ≥ 1 (post période grâce) | 60.000 membres | — | 0.000 membres | 0% | already-broken | 0 |
| Croissance YoY (multiplicateur global) | lower-is-worse | Trésorerie creux ≥ 0 | 1.000 × growthRates | 0.875 × growthRates | -0.125 × growthRates | 12% | found | 14 |
| Croissance YoY (multiplicateur global) | lower-is-worse | Break-even atteint dans l'horizon | 1.000 × growthRates | 0.331 × growthRates | -0.669 × growthRates | 67% | found | 14 |
| Croissance YoY (multiplicateur global) | lower-is-worse | EBITDA dernier FY ≥ 0 | 1.000 × growthRates | 0.787 × growthRates | -0.213 × growthRates | 21% | found | 14 |
| Croissance YoY (multiplicateur global) | lower-is-worse | DSCR min annuel ≥ 1 (post période grâce) | 1.000 × growthRates | — | 0.000 × growthRates | 0% | already-broken | 0 |
| ARPU (multiplicateur global prix tiers) | lower-is-worse | Trésorerie creux ≥ 0 | 1.000 × prix | 0.954 × prix | -0.046 × prix | 5% | found | 13 |
| ARPU (multiplicateur global prix tiers) | lower-is-worse | Break-even atteint dans l'horizon | 1.000 × prix | 0.657 × prix | -0.343 × prix | 34% | found | 13 |
| ARPU (multiplicateur global prix tiers) | lower-is-worse | EBITDA dernier FY ≥ 0 | 1.000 × prix | 0.864 × prix | -0.136 × prix | 14% | found | 13 |
| ARPU (multiplicateur global prix tiers) | lower-is-worse | DSCR min annuel ≥ 1 (post période grâce) | 1.000 × prix | — | 0.000 × prix | 0% | already-broken | 0 |
| Indexation prix annuelle | lower-is-worse | Trésorerie creux ≥ 0 | 2.00% | 0.13% | -1.87% | 93% | found | 11 |
| Indexation prix annuelle | lower-is-worse | Break-even atteint dans l'horizon | 2.00% | -7.80% | -9.80% | 490% | found | 11 |
| Indexation prix annuelle | lower-is-worse | EBITDA dernier FY ≥ 0 | 2.00% | -0.47% | -2.47% | 123% | found | 11 |
| Indexation prix annuelle | lower-is-worse | DSCR min annuel ≥ 1 (post période grâce) | 2.00% | — | 0.00% | 0% | already-broken | 0 |
| Masse salariale (multiplicateur) | higher-is-worse | Trésorerie creux ≥ 0 | 1.000 × salaires | 1.079 × salaires | 0.079 × salaires | 8% | found | 14 |
| Masse salariale (multiplicateur) | higher-is-worse | Break-even atteint dans l'horizon | 1.000 × salaires | 2.151 × salaires | 1.151 × salaires | 115% | found | 14 |
| Masse salariale (multiplicateur) | higher-is-worse | EBITDA dernier FY ≥ 0 | 1.000 × salaires | 1.360 × salaires | 0.360 × salaires | 36% | found | 14 |
| Masse salariale (multiplicateur) | higher-is-worse | DSCR min annuel ≥ 1 (post période grâce) | 1.000 × salaires | — | 0.000 × salaires | 0% | already-broken | 0 |
| Indexation salaires annuelle | higher-is-worse | Trésorerie creux ≥ 0 | 2.00% | 5.21% | 3.21% | 160% | found | 11 |
| Indexation salaires annuelle | higher-is-worse | Break-even atteint dans l'horizon | 2.00% | 15.00% | 13.00% | 650% | no-break-in-bounds | 1 |
| Indexation salaires annuelle | higher-is-worse | EBITDA dernier FY ≥ 0 | 2.00% | 5.87% | 3.87% | 194% | found | 11 |
| Indexation salaires annuelle | higher-is-worse | DSCR min annuel ≥ 1 (post période grâce) | 2.00% | — | 0.00% | 0% | already-broken | 0 |
| Charges patronales (fallback global) | higher-is-worse | Trésorerie creux ≥ 0 | 0.00% | 80.00% | 80.00% | — | no-break-in-bounds | 1 |
| Charges patronales (fallback global) | higher-is-worse | Break-even atteint dans l'horizon | 0.00% | 80.00% | 80.00% | — | no-break-in-bounds | 1 |
| Charges patronales (fallback global) | higher-is-worse | EBITDA dernier FY ≥ 0 | 0.00% | 80.00% | 80.00% | — | no-break-in-bounds | 1 |
| Charges patronales (fallback global) | higher-is-worse | DSCR min annuel ≥ 1 (post période grâce) | 0.00% | — | 0.00% | 0% | already-broken | 0 |
| Loyer (multiplicateur tous FY) | higher-is-worse | Trésorerie creux ≥ 0 | 1.000 × loyer | 1.151 × loyer | 0.151 × loyer | 15% | found | 14 |
| Loyer (multiplicateur tous FY) | higher-is-worse | Break-even atteint dans l'horizon | 1.000 × loyer | 2.000 × loyer | 1.000 × loyer | 100% | no-break-in-bounds | 1 |
| Loyer (multiplicateur tous FY) | higher-is-worse | EBITDA dernier FY ≥ 0 | 1.000 × loyer | 1.721 × loyer | 0.721 × loyer | 72% | found | 14 |
| Loyer (multiplicateur tous FY) | higher-is-worse | DSCR min annuel ≥ 1 (post période grâce) | 1.000 × loyer | — | 0.000 × loyer | 0% | already-broken | 0 |
| CAPEX total (multiplicateur) | higher-is-worse | Trésorerie creux ≥ 0 | 1.000 × CAPEX | 1.405 × CAPEX | 0.405 × CAPEX | 40% | found | 15 |
| CAPEX total (multiplicateur) | higher-is-worse | Break-even atteint dans l'horizon | 1.000 × CAPEX | 3.000 × CAPEX | 2.000 × CAPEX | 200% | no-break-in-bounds | 1 |
| CAPEX total (multiplicateur) | higher-is-worse | EBITDA dernier FY ≥ 0 | 1.000 × CAPEX | 3.000 × CAPEX | 2.000 × CAPEX | 200% | no-break-in-bounds | 1 |
| CAPEX total (multiplicateur) | higher-is-worse | DSCR min annuel ≥ 1 (post période grâce) | 1.000 × CAPEX | — | 0.000 × CAPEX | 0% | already-broken | 0 |
| Taux emprunts bancaires (annuel) | higher-is-worse | Trésorerie creux ≥ 0 | 4.000 % annuel | 20.000 % annuel | 16.000 % annuel | 400% | no-break-in-bounds | 1 |
| Taux emprunts bancaires (annuel) | higher-is-worse | Break-even atteint dans l'horizon | 4.000 % annuel | 20.000 % annuel | 16.000 % annuel | 400% | no-break-in-bounds | 1 |
| Taux emprunts bancaires (annuel) | higher-is-worse | EBITDA dernier FY ≥ 0 | 4.000 % annuel | 20.000 % annuel | 16.000 % annuel | 400% | no-break-in-bounds | 1 |
| Taux emprunts bancaires (annuel) | higher-is-worse | DSCR min annuel ≥ 1 (post période grâce) | 4.000 % annuel | — | 0.000 % annuel | 0% | already-broken | 0 |
| Taux obligations (annuel) | higher-is-worse | Trésorerie creux ≥ 0 | 8.000 % annuel | 16.182 % annuel | 8.182 % annuel | 102% | found | 17 |
| Taux obligations (annuel) | higher-is-worse | Break-even atteint dans l'horizon | 8.000 % annuel | 20.000 % annuel | 12.000 % annuel | 150% | no-break-in-bounds | 1 |
| Taux obligations (annuel) | higher-is-worse | EBITDA dernier FY ≥ 0 | 8.000 % annuel | 20.000 % annuel | 12.000 % annuel | 150% | no-break-in-bounds | 1 |
| Taux obligations (annuel) | higher-is-worse | DSCR min annuel ≥ 1 (post période grâce) | 8.000 % annuel | — | 0.000 % annuel | 0% | already-broken | 0 |
| Taux IS | higher-is-worse | Trésorerie creux ≥ 0 | 25.00% | 40.00% | 15.00% | 60% | no-break-in-bounds | 1 |
| Taux IS | higher-is-worse | Break-even atteint dans l'horizon | 25.00% | 40.00% | 15.00% | 60% | no-break-in-bounds | 1 |
| Taux IS | higher-is-worse | EBITDA dernier FY ≥ 0 | 25.00% | 40.00% | 15.00% | 60% | no-break-in-bounds | 1 |
| Taux IS | higher-is-worse | DSCR min annuel ≥ 1 (post période grâce) | 25.00% | — | 0.00% | 0% | already-broken | 0 |
| Retard d'ouverture (mois) | higher-is-worse | Trésorerie creux ≥ 0 | 0.000 mois | 1.500 mois | 1.500 mois | — | found | 17 |
| Retard d'ouverture (mois) | higher-is-worse | Break-even atteint dans l'horizon | 0.000 mois | 8.500 mois | 8.500 mois | — | found | 17 |
| Retard d'ouverture (mois) | higher-is-worse | EBITDA dernier FY ≥ 0 | 0.000 mois | 3.500 mois | 3.500 mois | — | found | 17 |
| Retard d'ouverture (mois) | higher-is-worse | DSCR min annuel ≥ 1 (post période grâce) | 0.000 mois | — | 0.000 mois | 0% | already-broken | 0 |

---

## Interprétation pour data-room investisseur

- **🟢 robuste** : marge > 30% — le BP supporte un choc significatif sans rupture.
- **🟡 moyen** : marge 10–30% — vulnérable à un choc modéré, mitigation requise.
- **🔴 fragile** : marge < 10% — un choc terrain standard tue le modèle. Action requise.
- **💀 déjà cassé** : la métrique est déjà négative au scénario base — bug du BP à corriger immédiatement.
- **no-break-in-bounds** : même en stress extrême la métrique tient — peut être un signal d'imprécision (vérifier worstBound).
