/**
 * Source-map — pour chaque paramètre business, mémorise :
 * - origine documentée (devis, contrat, fait de marché, hypothèse, etc.)
 * - benchmark sectoriel à utiliser pour challenger la valeur
 * - seuil d'audit à respecter (auditThreshold associé)
 * - note de plausibilité — état de validation actuel
 * - criticité business (priorité pour review investisseur)
 *
 * Cette map est intentionnellement *incomplète* à l'initialisation : elle
 * matérialise le travail de sourcing que le fondateur doit compléter pour
 * supprimer chaque "trou dans la raquette". Chaque entrée TODO est un risque
 * de question investisseur sans réponse.
 *
 * Convention path : identique à `param-inventory.flattenParams` (dot-notation
 * avec `[idx]` pour les arrays explosés). Les patterns `[*]` matchent
 * toutes les positions de l'array.
 */

export type ParamCriticality = "critical" | "high" | "medium" | "low";
export type SourceState = "validated" | "to-validate" | "missing" | "estimated";

export type ParamSource = {
  /** Description courte de l'origine de la valeur. */
  sourceRef: string;
  /** État du sourcing — "missing" = trou raquette à combler. */
  state: SourceState;
  /** Clé du `sectorBenchmarks` à utiliser pour challenger (ou null si non applicable). */
  benchmarkRef?: string | null;
  /** Clé du `auditThresholds` qui gouverne ce param (ou null). */
  thresholdRef?: string | null;
  /** Criticité business : drivers principaux du BP en first. */
  criticality: ParamCriticality;
  /** Justification narrative — ce qu'un investisseur veut entendre en 1 phrase. */
  rationale?: string;
  /** Tests à mener en priorité (cf livrable B reverse-stress + livrable C UI). */
  testsRecommended?: string[];
};

/**
 * Map path → metadata. Les patterns avec `[*]` sont expandés à la lecture.
 * Préseed couvre les ~50 paramètres les plus critiques pour un BP investisseur.
 * Reste = à compléter par le fondateur (sourcing + validation 4-eyes).
 */
export const PARAM_SOURCES: Record<string, ParamSource> = {
  // === TIMELINE ===
  "timeline.startYear": {
    sourceRef: "Décision projet — ouverture Sept 2026",
    state: "validated",
    criticality: "high",
    rationale: "Premier mois P&L = Sept 2026. Tout retard décale break-even.",
    testsRecommended: ["Retard ouverture 3/6 mois via openingDelay driver"],
  },
  "timeline.horizonYears": {
    sourceRef: "Pratique BP startup pré-Series A: 5-7 ans",
    state: "validated",
    criticality: "low",
    rationale: "7 ans = couvre durée bond 5y + 2y post-remboursement.",
  },

  // === REVENUE — TIERS ABO ===
  "subs.tiers[*].monthlyPrice": {
    sourceRef: "Tarifs catalogue CFRG (5 tiers abonnement)",
    state: "to-validate",
    // benchmarkRef volontairement null : le benchmark `monthlyPriceCrossfit`
    // 130-220€ s'applique au prix MOYEN PONDÉRÉ par mixPct, pas à chaque tier
    // individuel (le tier "4 séances" est légitimement sous 130€). La comparaison
    // pondérée est faite par le module aggregateBenchmarks (cf param-audit-report).
    benchmarkRef: null,
    criticality: "critical",
    rationale: "Prix de chaque tier. Le contrôle benchmark se fait sur ARPU pondéré (cf agrégats).",
    testsRecommended: ["Tornado ±10%", "Reverse: prix min pour cashTrough>0"],
  },
  "subs.tiers[*].mixPct": {
    sourceRef: "Hypothèse fondateur basée sur historique legacy",
    state: "to-validate",
    criticality: "critical",
    rationale: "Mix tier détermine ARPU. Bascule premium → cheap = -15-20% revenu.",
    testsRecommended: ["Tornado mixPremiumShift", "Sensibilité ARPU pondéré"],
  },
  "subs.tiers[*].monthlyChurnPct": {
    sourceRef: "À sourcer cohorte legacy CFRG (Javelot/ResaWod 24+ mois)",
    state: "missing",
    benchmarkRef: "churnCrossfitCommunity",
    thresholdRef: "churnMajorThreshold",
    criticality: "critical",
    rationale: "Churn par tier — illimité churne moins que 4-séances. Diff doit refléter usage.",
  },
  "subs.tiers[*].acquisitionMixPct": {
    sourceRef: "Hypothèse",
    state: "missing",
    criticality: "medium",
    rationale: "Si différent de mixPct, modélise acquisition vs stock.",
  },

  // === REVENUE — TRAJECTOIRE GLOBALE ===
  "subs.rampStartCount": {
    sourceRef: "Hypothèse pré-inscriptions M0",
    state: "missing",
    // membersMatureCrossfit s'applique à fin Y3+, pas à M0. Pas de bench leaf direct.
    benchmarkRef: null,
    criticality: "critical",
    rationale: "Effectif M0. 80 membres dès ouverture = signal demande contractualisé requis (LOI, dépôts pré-inscription).",
    testsRecommended: ["Reverse: ramp min pour break-even <24mo"],
  },
  "subs.rampEndCount": {
    sourceRef: "Cible interne fin FY26",
    state: "to-validate",
    // membersMatureCrossfit s'applique à fin d'horizon (mature 18-36mo), pas fin M12.
    // Comparé en agrégat par aggregateBenchmarks via subsCount fin d'horizon.
    benchmarkRef: null,
    criticality: "critical",
    rationale: "200 fin M12 = ramp Y1 ambitieux. Boxes parisiennes atteignent 250-450 en 18-36 mo, pas 12.",
    testsRecommended: ["Tornado ±20%", "Calibrate vs Reebok Louvre Y1 réel"],
  },
  "subs.growthRates": {
    sourceRef: "Trajectoire ramp post-FY26",
    state: "to-validate",
    thresholdRef: "growthMagicYoy",
    criticality: "critical",
    rationale: "Croissance YoY combinée à churn doit rester cohérente (pas magic growth).",
    testsRecommended: ["Tornado subsGrowth", "Décomposer acquisition vs churn"],
  },
  "subs.priceIndexPa": {
    sourceRef: "Décision pricing — inflation FR ~2%",
    state: "to-validate",
    criticality: "high",
    rationale: "Geler prix nominal = baisse prix réel ~15% horizon 7y. À justifier.",
    testsRecommended: ["AUDIT-CORRECTED utilise 2%"],
  },
  "subs.monthlyChurnPct": {
    sourceRef: "À sourcer cohorte réelle",
    state: "missing",
    benchmarkRef: "churnCrossfitCommunity",
    thresholdRef: "churnKillLevel",
    criticality: "critical",
    rationale: "Churn=0 = kill VC. Cible défendable: 1.5-3%/mo.",
    testsRecommended: ["Tornado churn 0→3%/mo", "Reverse: churn max avant cashTrough<0"],
  },
  "subs.seasonality": {
    sourceRef: "Heuristique calendrier scolaire FR",
    state: "to-validate",
    criticality: "medium",
    rationale: "Pic Sept/Janv, creux juillet-août. À valider vs CRM historique.",
  },
  "subs.vatRate": {
    sourceRef: "Code général des impôts FR — TVA 20%",
    state: "validated",
    criticality: "high",
    rationale: "TVA 20% standard prestations sportives non éligibles taux réduit.",
  },

  // === REVENUE — FUNNEL BILAN ===
  "subs.bilanFunnel.enabled": {
    sourceRef: "Process commercial CFRG",
    state: "to-validate",
    criticality: "high",
    rationale: "Bilan 19,90€ = porte d'entrée payante, conversion clé.",
  },
  "subs.bilanFunnel.conversionPct": {
    sourceRef: "Historique conversions CFRG ou estimé secteur",
    state: "missing",
    criticality: "critical",
    rationale: "Taux conversion bilan → abo = principal driver acquisition.",
    testsRecommended: ["Tornado conversionBilan ±30%"],
  },
  "subs.bilanFunnel.bilanPriceTTC": {
    sourceRef: "Tarif affiché site CFRG",
    state: "validated",
    criticality: "low",
  },

  // === LEGACY ===
  "legacy.startCount": {
    sourceRef: "CRM CFRG — membres actifs à reprise",
    state: "to-validate",
    criticality: "high",
    rationale: "220 membres legacy = atout de demande validée mais churn impact direct.",
  },
  "legacy.avgMonthlyPrice": {
    sourceRef: "Tarif moyen mensuel CRM CFRG legacy",
    state: "to-validate",
    criticality: "high",
  },
  "legacy.yearlyChurnAbs": {
    sourceRef: "Hypothèse",
    state: "missing",
    criticality: "medium",
    rationale: "24 churns/an sur 220 = 0.9%/mo — bas. À valider.",
  },

  // === SALAIRES ===
  "salaries.items[*].monthlyGross": {
    sourceRef: "Marché salarial coach/manager Paris",
    state: "to-validate",
    criticality: "high",
    rationale: "Coach CrossFit Paris: 2200-3500€ brut. Sales manager: 3000-4500€.",
  },
  "salaries.items[*].fte": {
    sourceRef: "Décision staffing",
    state: "validated",
    criticality: "high",
  },
  "salaries.items[*].category": {
    sourceRef: "Convention collective sport + statut associé",
    state: "validated",
    criticality: "critical",
    rationale: "Détermine charges patronales (cadre 42%, non-cadre 40%, TNS 45%).",
  },
  "salaries.items[*].fy26Bump": {
    sourceRef: "Hypothèse rattrapage post-FY26",
    state: "to-validate",
    criticality: "high",
  },
  "salaries.annualIndexPa": {
    sourceRef: "SMIC + convention collective",
    state: "to-validate",
    criticality: "high",
    rationale: "SMIC indexé chaque année. 0% interdit légalement, +2% défendable.",
    testsRecommended: ["AUDIT-CORRECTED utilise 2%"],
  },
  "salaries.chargesPatroPct": {
    sourceRef: "URSSAF — abrogé par category-based",
    state: "validated",
    thresholdRef: "isThresholdNetIncome",
    criticality: "critical",
    rationale: "Fallback global. La logique réelle utilise `chargesProfiles` par catégorie.",
  },
  "salaries.freelancePools[*].hourlyRate": {
    sourceRef: "Marché coach freelance Paris",
    state: "to-validate",
    criticality: "high",
    rationale: "25€/h floor coach = mid-market. Sandboxs/Hyrox: à vérifier.",
  },
  "salaries.freelancePools[*].monthlyHours": {
    sourceRef: "Planning horaire détaillé",
    state: "to-validate",
    criticality: "critical",
    rationale: "Heures × taux = masse freelance, second poste coût après salariés.",
  },

  // === LOYER ===
  "rent.monthlyByFy": {
    sourceRef: "Bail commercial / LOI bailleur",
    state: "missing",
    benchmarkRef: "rentPerSqmParisYear",
    thresholdRef: "rentJumpRatio",
    criticality: "critical",
    rationale: "Saut FY26→FY27 (10000→18113) atypique. LOI/bail requis.",
    testsRecommended: ["Tornado rent ±10%", "Sensibilité ratio Y1→Y2"],
  },
  "rent.yearlyTaxes": {
    sourceRef: "Taxe foncière / taxe ordures",
    state: "to-validate",
    criticality: "medium",
  },
  "rent.monthlyCoopro": {
    sourceRef: "Charges copropriété immeuble",
    state: "to-validate",
    criticality: "medium",
  },
  "rent.franchiseMonths": {
    sourceRef: "Négociation bailleur",
    state: "missing",
    criticality: "high",
    rationale: "Mois de franchise = cash décalé. Standard 1-3 mois sur bail commercial.",
  },

  // === RECURRING / ONE-OFF ===
  "recurring[*].monthly": {
    sourceRef: "Devis / contrats fournisseurs",
    state: "to-validate",
    criticality: "medium",
    rationale: "Électricité 3000€/mo notamment à valider (crise énergie).",
  },
  "oneOffs[*].amount": {
    sourceRef: "Factures historiques",
    state: "to-validate",
    criticality: "low",
  },

  // === MARKETING ===
  "marketing.monthlyBudget": {
    sourceRef: "Budget acquisition arbitré",
    state: "to-validate",
    // cacFitness s'applique au CAC PAR MEMBRE acquis (€/lead converti), pas au
    // budget mensuel total. Comparaison dérivée par aggregateBenchmarks
    // (budget × 12 / new members → CAC implicite vs 80-150€).
    benchmarkRef: null,
    criticality: "critical",
    rationale: "Budget marketing mensuel fixe. CAC implicite = budget Y1 / new members Y1.",
    testsRecommended: ["Tornado ±20%", "Decompose par canal"],
  },
  "marketing.indexPa": {
    sourceRef: "Décision",
    state: "to-validate",
    criticality: "low",
  },
  "marketing.pctOfRevenue": {
    sourceRef: "Décision",
    state: "to-validate",
    criticality: "high",
    rationale: "Mix fixe vs %CA. AUDIT-CORRECTED utilise 2% CA.",
  },

  // === PROVISIONS ===
  "provisions.monthlyEquipement": {
    sourceRef: "Hypothèse renouvellement matériel",
    state: "to-validate",
    criticality: "medium",
  },
  "provisions.monthlyTravaux": {
    sourceRef: "Hypothèse entretien locaux",
    state: "to-validate",
    criticality: "medium",
  },

  // === CAPEX ===
  "capex.equipment": {
    sourceRef: "Devis équipement CrossFit/Hyrox",
    state: "to-validate",
    thresholdRef: "daThresholdCapex",
    criticality: "high",
    rationale: "74k€ équipement = base amortissable 5y. Devis fournisseurs requis.",
  },
  "capex.travaux": {
    sourceRef: "Devis travaux aménagement local",
    state: "to-validate",
    criticality: "critical",
    rationale: "100k€ travaux — risque dérapage. Devis multiples + contingency.",
    testsRecommended: ["Scénario travaux +30% / -3 mois retard"],
  },
  "capex.juridique": {
    sourceRef: "Honoraires avocat + greffe + études",
    state: "to-validate",
    criticality: "low",
  },
  "capex.depots": {
    sourceRef: "Dépôt garantie bail + autres",
    state: "to-validate",
    criticality: "medium",
    rationale: "78k€ = ~3 mois loyer FY27. Cohérent avec usage.",
  },

  // === FINANCING ===
  "financing.equity[*].amount": {
    sourceRef: "Engagements fonds propres",
    state: "to-validate",
    thresholdRef: "debtRatioMax",
    criticality: "critical",
    rationale: "400k€ equity dont 100k perso. À matérialiser (term sheet, virement).",
  },
  "financing.loans[*].principal": {
    sourceRef: "Term sheet bancaire",
    state: "missing",
    thresholdRef: "debtRatioMax",
    criticality: "critical",
    rationale: "200k€ emprunt — accord bancaire signé ou LOI requise.",
  },
  "financing.loans[*].annualRatePct": {
    sourceRef: "Indication banque",
    state: "to-validate",
    thresholdRef: "loanRateMaxPlausiblePct",
    criticality: "high",
    rationale: "3% taux 2026 = optimiste sur BCE. 4-5% plus défendable.",
    testsRecommended: ["Tornado loanRate ±30%"],
  },
  "financing.loans[*].termMonths": {
    sourceRef: "Négociation banque",
    state: "to-validate",
    criticality: "medium",
  },
  "financing.bonds[*].principal": {
    sourceRef: "Investisseurs obligataires",
    state: "missing",
    thresholdRef: "debtRatioMax",
    criticality: "critical",
    rationale: "200k€ bond — souscripteurs identifiés requis.",
  },
  "financing.bonds[*].annualRatePct": {
    sourceRef: "Marché obligations PME",
    state: "to-validate",
    criticality: "high",
    rationale: "6% PME pré-CA = bas. 8-10% plus réaliste.",
  },
  "financing.bonds[*].deferralYears": {
    sourceRef: "Term sheet",
    state: "to-validate",
    thresholdRef: "bondDeferralMinYears",
    criticality: "high",
  },
  "financing.bonds[*].capitalizeInterest": {
    sourceRef: "Term sheet PIK",
    state: "to-validate",
    criticality: "high",
    rationale: "PIK soulage cash mais explose notional final.",
  },

  // === TAX ===
  "tax.isRate": {
    sourceRef: "CGI 2026 — IS 25% (15% jusque 42500€)",
    state: "validated",
    benchmarkRef: "isRateFR",
    criticality: "high",
  },
  "tax.enableIs": {
    sourceRef: "Décision modèle",
    state: "to-validate",
    thresholdRef: "isThresholdNetIncome",
    criticality: "critical",
    rationale: "false dans DEFAULT_PARAMS = bug audit. AUDIT-CORRECTED active.",
  },
  "tax.enableDA": {
    sourceRef: "Décision modèle",
    state: "to-validate",
    thresholdRef: "daThresholdCapex",
    criticality: "critical",
    rationale: "false = pas d'amortissement = P&L surévalué.",
  },
  "tax.daYears": {
    sourceRef: "Plan comptable général",
    state: "validated",
    criticality: "medium",
  },
  "tax.amortYearsEquipment": {
    sourceRef: "PCG — équipement sportif 5-10 ans",
    state: "validated",
    criticality: "medium",
  },
  "tax.amortYearsTravaux": {
    sourceRef: "PCG — agencement 10-20 ans",
    state: "validated",
    criticality: "medium",
  },

  // === BFR ===
  "bfr.daysOfRevenue": {
    sourceRef: "Encaissement Square + délais fournisseurs",
    state: "to-validate",
    thresholdRef: "bfrWarnDays",
    criticality: "high",
    rationale: "0j dans DEFAULT_PARAMS = irréaliste. AUDIT-CORRECTED: 15j.",
  },

  // === OPENING CASH ===
  "openingCash": {
    sourceRef: "Trésorerie M0 hors financements",
    state: "to-validate",
    criticality: "high",
    rationale: "0 = financement couvre 100% du démarrage. Réserve fondateur ?",
  },
};

/**
 * Résout la `ParamSource` pour un path donné, en gérant les patterns `[*]`.
 * Retourne undefined si aucune entrée ne matche.
 */
export function resolveSource(path: string): ParamSource | undefined {
  // Match exact d'abord
  if (PARAM_SOURCES[path]) return PARAM_SOURCES[path];
  // Match patterns [*]
  for (const key of Object.keys(PARAM_SOURCES)) {
    if (!key.includes("[*]")) continue;
    const re = new RegExp("^" + key.replace(/\[\*\]/g, "\\[\\d+\\]") + "$");
    if (re.test(path)) return PARAM_SOURCES[key];
  }
  return undefined;
}
