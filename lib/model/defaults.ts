import type { ModelParams } from "./types";

// Default params: projet démarre Sept 2026, horizon 7 ans (FY26→FY32)
export const DEFAULT_PARAMS: ModelParams = {
  timeline: {
    startYear: 2026,
    horizonYears: 7,
  },

  subs: {
    tiers: [
      { id: "ill2", name: "Abo Illimité (2 séances/j)", monthlyPrice: 157.5, mixPct: 0.10 },
      { id: "ill1", name: "Abo Illimité (1 séance/j)", monthlyPrice: 133.33, mixPct: 0.40 },
      { id: "s12",  name: "Abo 12 séances", monthlyPrice: 116.67, mixPct: 0.20 },
      { id: "s8",   name: "Abo 8 séances", monthlyPrice: 100.0, mixPct: 0.20 },
      { id: "s4",   name: "Abo 4 séances", monthlyPrice: 70.83, mixPct: 0.10 },
    ],
    vatRate: 0.20,
    rampStartCount: 80,
    rampEndCount: 200,
    // 6 taux de croissance pour FY27..FY32 (post ramp-up FY26)
    growthRates: [0.40, 0.30, 0.20, 0.15, 0.10, 0.08],
    priceIndexPa: 0.0,
    // Saisonnalité Sept..Août. Sept et janv = pics, juillet/août = creux
    seasonality: [1.20, 1.05, 1.0, 0.85, 1.15, 1.05, 1.0, 0.95, 0.90, 0.80, 0.65, 0.60],
    monthlyChurnPct: 0.0,
  },

  legacy: {
    startCount: 220,
    avgMonthlyPrice: 120.83,
    yearlyChurnAbs: 24,
  },

  prestations: {
    teen:   { price: 41.67, startCount: 10, growthPa: 0.10 },
    senior: { price: 33.33, startCount: 10, growthPa: 0.10 },
    horsAbo:{ monthlyAvg: 4166, growthPa: 0.05 },
  },

  merch: { monthlyMargin: 351, growthPa: 0.0 },

  salaries: {
    items: [
      // Catégories assignées pour que les charges patronales URSSAF soient appliquées
      // (sinon `chargesPatroPct = 0` global donnerait des charges nulles, P&L biaisé).
      { id: "salesmgr", role: "Sales manager", monthlyGross: 3300, fte: 1, startMonth: 0, fy26Bump: 3818, category: "non-cadre" },
      { id: "headcoach", role: "Headcoach", monthlyGross: 3300, fte: 2, startMonth: 0, fy26Bump: 4240, category: "non-cadre" },
      // Associés gérants majoritaires SARL = TNS (URSSAF dirigeants), pas un salarié cadre.
      { id: "associes", role: "Associés gérants", monthlyGross: 3300, fte: 2, startMonth: 0, category: "tns" },
    ],
    freelancePools: [
      { id: "floor_cfrg", name: "Floor CFRG", hourlyRate: 25, monthlyHours: 206.4, hoursPerWeekday: 8, hoursPerWeekendDay: 4 },
      { id: "floor_hyrox", name: "Floor Hyrox", hourlyRate: 25, monthlyHours: 146.2, hoursPerWeekday: 6, hoursPerWeekendDay: 2 },
      { id: "floor_sandbox", name: "Floor sandbox", hourlyRate: 25, monthlyHours: 10.32, hoursPerWeekday: 0.4, hoursPerWeekendDay: 0.2 },
      { id: "cadre_coaching", name: "Cours inclus dans 2 headcoach cadre", hourlyRate: 25, monthlyHours: -43 },
      { id: "accueil", name: "Espace accueil", hourlyRate: 20, monthlyHours: 206.4, hoursPerWeekday: 8, hoursPerWeekendDay: 4 },
      { id: "entretiens_com", name: "Entretiens (commercial)", hourlyRate: 25, monthlyHours: 90 },
      { id: "cadre_entretiens", name: "Entretiens inclus dans 2 headcoach cadre", hourlyRate: 25, monthlyHours: -51.6 },
    ],
    annualIndexPa: 0.0,
    chargesPatroPct: 0,
  },

  rent: {
    // 7 années: FY26 année 1 (loyer réduit), FY27 hausse, puis stabilisé
    monthlyByFy: [10000, 18113, 12500, 12500, 12500, 12500, 12500],
    yearlyTaxes: 12000,
    monthlyCoopro: 833,
  },

  recurring: [
    { id: "elec", name: "Électricité", monthly: 3000, category: "entretien" },
    { id: "eau", name: "Eau", monthly: 335, category: "entretien" },
    { id: "menage", name: "Société de Ménage", monthly: 5000, category: "entretien" },
    { id: "assu", name: "Assurance", monthly: 500, category: "frais_op" },
    { id: "primesassu", name: "Primes assurance", monthly: 300, category: "frais_op" },
    { id: "affilcf", name: "Affiliation CrossFit + Hyrox", monthly: 395, category: "frais_op" },
    { id: "compta", name: "Honoraires comptable", monthly: 500, category: "frais_op" },
    { id: "verisure", name: "Vérisure", monthly: 170, category: "frais_op" },
    { id: "music", name: "Abonnement musique", monthly: 35, category: "frais_op" },
    { id: "banque", name: "Frais bancaires", monthly: 90, category: "frais_op" },
    { id: "tel", name: "Téléphone, Internet", monthly: 60, category: "frais_op" },
  ],

  oneOffs: [
    { id: "sacem", name: "SACEM", amount: 4739, month: 9, yearly: true },
    { id: "doc", name: "Documentation", amount: 420, month: 5, yearly: true },
    { id: "extincteurs", name: "Extincteurs", amount: 420, month: 0, yearly: true },
    { id: "defib", name: "Défibrillateur", amount: 350, month: 0, yearly: true },
  ],

  marketing: {
    monthlyBudget: 2700,
    indexPa: 0.0,
    pctOfRevenue: 0.0,
  },

  provisions: {
    monthlyEquipement: 450,
    monthlyTravaux: 500,
    indexPa: 0.0,
  },

  capex: {
    equipment: 74252,
    travaux: 100000,
    juridique: 23950,
    depots: 78000,
  },

  financing: {
    equity: [
      { id: "apport_perso", name: "Apport personnel", amount: 100000, startMonth: 0 },
      { id: "levee", name: "Levée de fonds (associés/investisseurs)", amount: 300000, startMonth: 0 },
    ],
    loans: [
      {
        id: "loan_bank",
        name: "Emprunt bancaire",
        principal: 200000,
        annualRatePct: 3.0,
        termMonths: 84,
        startMonth: 0,
      },
    ],
    bonds: [
      {
        id: "bond_1",
        name: "Obligation non convertible (in fine, différé capitalisé)",
        principal: 200000,
        annualRatePct: 6,
        termYears: 5,
        frequency: 1,
        amortization: "bullet",
        deferralYears: 2,
        capitalizeInterest: true,
        startMonth: 0,
      },
    ],
  },

  tax: {
    isRate: 0.25,
    enableIs: false,
    enableDA: false,
    daYears: 5,
    amortYearsEquipment: 5,
    amortYearsTravaux: 10,
    // % d'OPEX (hors salaires) avec TVA déductible quand `enableVat` est actif.
    // Surface explicite pour éviter un default silencieux côté compute.ts.
    vatDeductibleOpexPct: 0.5,
  },

  bfr: { daysOfRevenue: 0 },
  openingCash: 0,

  auditThresholds: {
    ltvCacMin: 3,
    churnKillLevel: 0,
    churnMajorThreshold: 0.015,
    growthMagicYoy: 0.30,
    growthMagicChurn: 0.02,
    debtRatioMax: 0.5,
    founderMinPct: 0.6,
    bondDeferralMinYears: 2,
    isThresholdNetIncome: 50_000,
    daThresholdCapex: 50_000,
    rentJumpRatio: 1.3,
    cashBufferThinEur: 50_000,
    cashThinSynthesisEur: 50_000,
    cashThinHealthEur: 10_000,
    salaryPctHighThreshold: 0.50,
    salaryPctMediumThreshold: 0.35,
    ebitdaMarginAlertNeg: -0.10,
    irrGoodThreshold: 0.15,
    dscrGoodThreshold: 1.2,
    dscrLimitThreshold: 1.0,
    ltvCacGoodThreshold: 3,
    ltvCacWarnThreshold: 1,
    bfrWarnDays: 90,
    bfrCriticalDays: 180,
    capacityAlertSaturation: 0.95,
    capacityCriticalSaturation: 1.0,
    loanRateMaxPlausiblePct: 30,
    verdictKillMinCount: 1,
    verdictMajorBlockingCount: 4,
    verdictMajorWarnCount: 1,
  },

  investorAssumptions: {
    exitMultipleEbitda: 5,
    discountRate: 0.10,
    retentionMonthsFallback: 24,
  },

  sectorBenchmarks: {
    monthlyPriceCrossfit: { low: 130, high: 220, source: "Reebok Crossfit Louvre, Train Yard, CrossFit RG (sites publics 2024)" },
    monthlyPriceClassicGym: { low: 30, high: 60, source: "Basic Fit, Neoness, On Air (catalogues 2024)" },
    cacFitness: { low: 80, high: 150, source: "Étude IHRSA 2023, secteur fitness FR" },
    churnFitnessChain: { low: 0.03, high: 0.05, source: "IHRSA EU 2023" },
    churnCrossfitCommunity: { low: 0.015, high: 0.03, source: "CrossFit affiliate survey" },
    ebitdaMarginCrossfit: { low: 0.15, high: 0.25, source: "Étude Xerfi fitness FR 2023" },
    ebitdaMarginGym: { low: 0.20, high: 0.30, source: "Annual reports Basic Fit, Planet Fitness" },
    ltvCrossfitMonths: { low: 24, high: 36, source: "Cohort retention CrossFit affiliates" },
    classCapacityCrossfit: { low: 12, high: 16, source: "CrossFit HQ programming guidelines" },
    membersMatureCrossfit: { low: 250, high: 450, source: "CrossFit affiliate census 2023" },
    rentPerSqmParisYear: { low: 350, high: 700, source: "BNP Paribas Real Estate, indices 2024" },
    isRateFR: { low: 0.15, high: 0.25, source: "Code général des impôts FR" },
    multipleEbitdaFitness: { low: 4, high: 6, source: "M&A studies: Pitchbook fitness 2023" },
  },

  stressScenarios: [
    {
      id: "pessimist",
      label: "Pessimiste : -20% CA, +10% salaires, +5% loyer, churn +30%",
      tone: "warning",
      sliders: { caMultiplier: 0.8, salaryMultiplier: 1.1, rentMultiplier: 1.05, churnMultiplier: 1.3 },
    },
    {
      id: "optimist",
      label: "Optimiste : +20% CA, +10% marketing, churn -15%",
      tone: "success",
      sliders: { caMultiplier: 1.2, marketingMultiplier: 1.1, churnMultiplier: 0.85 },
    },
    {
      id: "recession",
      label: "Récession : -25% CA, churn +50%, taux +40%, prix gelés, marketing -30%",
      tone: "warning",
      sliders: {
        caMultiplier: 0.75,
        salaryMultiplier: 1.05,
        priceIndexMultiplier: 0,
        churnMultiplier: 1.5,
        loanRateMultiplier: 1.4,
        marketingMultiplier: 0.7,
      },
    },
    {
      id: "forceMajeure",
      label: "Force majeure : -50% CA temporaire, churn ×1.8 (lockdown / sinistre)",
      tone: "error",
      sliders: { caMultiplier: 0.5, churnMultiplier: 1.8, marketingMultiplier: 0.5 },
    },
    {
      id: "refinancing",
      label: "Refinancement difficile : taux ×1.7, retard 3 mois, -5% CA",
      tone: "warning",
      sliders: { loanRateMultiplier: 1.7, openingDelayMonths: 3, caMultiplier: 0.95 },
    },
  ],

  mcDefaults: {
    maxOpeningDelayMonths: 6,
    distribution: "uniform",
    enableCorrelation: true,
    // driverOverrides: undefined → laisse les rangePct par défaut de DEFAULT_DRIVERS dans monte-carlo.ts.
  },

  capacityHeuristics: {
    coachHoursPerFteMonth: 130,
    memberHoursDemandPerMonth: 12,
    cohortShareNew: 0.25,
    cohortShareMid: 0.35,
    cohortShareLong: 0.40,
    productiveRatio: 0.90,
    expectedFillRate: 0.70,
    targetSaturationDefault: 0.75,
    overflowSaturation: 1.5,
    peakRatioThreshold: 0.40,
  },
};

/**
 * Helpers d'accès — appliquent fallback sur defaults si user override partiel.
 * À utiliser depuis chaque consommateur au lieu de référencer directement les littéraux.
 */
export function getAuditThresholds(p: ModelParams) {
  return { ...DEFAULT_PARAMS.auditThresholds!, ...(p.auditThresholds ?? {}) };
}
export function getInvestorAssumptions(p: ModelParams) {
  return { ...DEFAULT_PARAMS.investorAssumptions!, ...(p.investorAssumptions ?? {}) };
}
export function getCapacityHeuristics(p: ModelParams) {
  return { ...DEFAULT_PARAMS.capacityHeuristics!, ...(p.capacityHeuristics ?? {}) };
}
export function getSectorBenchmarks(p: ModelParams) {
  // Le spread depuis DEFAULT_PARAMS.sectorBenchmarks garantit que toutes les clés sont présentes.
  // Cast en non-Partial pour les consommateurs (vc-audit, comparables) qui accèdent .low/.high.
  return { ...DEFAULT_PARAMS.sectorBenchmarks!, ...(p.sectorBenchmarks ?? {}) } as Required<
    NonNullable<ModelParams["sectorBenchmarks"]>
  >;
}
export function getStressScenarios(p: ModelParams) {
  return p.stressScenarios && p.stressScenarios.length > 0
    ? p.stressScenarios
    : DEFAULT_PARAMS.stressScenarios!;
}
export function getMcDefaults(p: ModelParams) {
  return { ...DEFAULT_PARAMS.mcDefaults!, ...(p.mcDefaults ?? {}) };
}

export const AUDIT_CORRECTED_PARAMS: ModelParams = {
  ...DEFAULT_PARAMS,
  salaries: {
    ...DEFAULT_PARAMS.salaries,
    annualIndexPa: 0.02,
  },
  marketing: {
    ...DEFAULT_PARAMS.marketing,
    pctOfRevenue: 0.02,
  },
  subs: {
    ...DEFAULT_PARAMS.subs,
    priceIndexPa: 0.02,
  },
  tax: {
    isRate: 0.25,
    enableIs: true,
    enableDA: true,
    daYears: 5,
  },
  bfr: {
    daysOfRevenue: 15,
  },
};
