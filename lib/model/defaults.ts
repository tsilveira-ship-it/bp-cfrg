import type { ModelParams } from "./types";

// Default params reproducing Prévi_gestion - v260505.xlsx (BP & CF Cible CFRG)
export const DEFAULT_PARAMS: ModelParams = {
  subs: {
    tiers: [
      { id: "ill2", name: "Abo Illimité (2 séances/j)", monthlyPrice: 157.5, mixPct: 0.10 },
      { id: "ill1", name: "Abo Illimité (1 séance/j)", monthlyPrice: 133.33, mixPct: 0.40 },
      { id: "s12",  name: "Abo 12 séances", monthlyPrice: 116.67, mixPct: 0.20 },
      { id: "s8",   name: "Abo 8 séances", monthlyPrice: 100.0, mixPct: 0.20 },
      { id: "s4",   name: "Abo 4 séances", monthlyPrice: 70.83, mixPct: 0.10 },
    ],
    rampStartCount: 80,    // Sept 2025 nouveaux abos
    rampEndCount: 200,     // Août 2026
    fy26GrowthPct: 0.40,   // doubles in counts but xlsx shows ~+30% sustained — calibrated below
    fy27GrowthPct: 0.30,
    fy28GrowthPct: 0.20,
    fy29GrowthPct: 0.15,
    priceIndexPa: 0.0,
  },

  legacy: {
    startCount: 220,
    avgMonthlyPrice: 120.83,
    yearlyChurnAbs: 24, // 220→200→180... (~24/y to match xlsx -29k€/y gross)
  },

  prestations: {
    teen:   { price: 41.67, startCount: 10, growthPa: 0.10 },
    senior: { price: 33.33, startCount: 10, growthPa: 0.10 },
    horsAbo:{ monthlyAvg: 4166, growthPa: 0.05 }, // 8333/2 starting low, ramp
  },

  merch: { monthlyMargin: 351, growthPa: 0.0 },

  salaries: {
    items: [
      { id: "salesmgr", role: "Sales manager", monthlyGross: 3300, fte: 1, startMonth: 0, fy26Bump: 3818 },
      { id: "headcoach", role: "Headcoach", monthlyGross: 3300, fte: 2, startMonth: 0, fy26Bump: 4240 },
      { id: "associes", role: "Associés gérants", monthlyGross: 3300, fte: 2, startMonth: 0 },
    ],
    annualIndexPa: 0.0, // user can crank up
    chargesPatroPct: 0,
  },

  rent: {
    monthlyByFy: [10000, 18113, 12500, 12500, 12500],
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
    { id: "sacem", name: "SACEM", amount: 4739, month: 9, yearly: true },         // Juin
    { id: "doc", name: "Documentation", amount: 420, month: 5, yearly: true },     // Févr
    { id: "extincteurs", name: "Extincteurs", amount: 420, month: 0, yearly: true },// Sept
    { id: "defib", name: "Défibrillateur", amount: 350, month: 0, yearly: true },  // Sept
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
    fundraise: 400000,
    loanMonthly: 2597.10,
    loanDurationMonths: 84, // 7y typical
    bondMonthly: 2000,           // coupon
    bondCapitalRepayMonthly: 6666.67,
    bondDurationMonths: 60,
  },

  tax: {
    isRate: 0.25,
    enableIs: false,   // matches xlsx (no IS)
    enableDA: false,   // matches xlsx (no D&A)
    daYears: 5,
  },

  bfr: {
    daysOfRevenue: 0,
  },

  openingCash: 0, // 400k arrives via fundraise FY25
};

// Audit-corrected version (toggleable in UI)
export const AUDIT_CORRECTED_PARAMS: ModelParams = {
  ...DEFAULT_PARAMS,
  salaries: {
    ...DEFAULT_PARAMS.salaries,
    annualIndexPa: 0.02, // 2% indexation salariale
  },
  marketing: {
    ...DEFAULT_PARAMS.marketing,
    pctOfRevenue: 0.02, // +2% du CA en marketing additionnel
  },
  subs: {
    ...DEFAULT_PARAMS.subs,
    priceIndexPa: 0.02, // 2% hausse tarif/an
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
