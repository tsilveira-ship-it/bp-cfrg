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
      { id: "salesmgr", role: "Sales manager", monthlyGross: 3300, fte: 1, startMonth: 0, fy26Bump: 3818 },
      { id: "headcoach", role: "Headcoach", monthlyGross: 3300, fte: 2, startMonth: 0, fy26Bump: 4240 },
      { id: "associes", role: "Associés gérants", monthlyGross: 3300, fte: 2, startMonth: 0 },
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
    fundraise: 400000,
    loanMonthly: 2597.10,
    loanDurationMonths: 84,
    bondMonthly: 2000,
    bondCapitalRepayMonthly: 6666.67,
    bondDurationMonths: 60,
  },

  tax: {
    isRate: 0.25,
    enableIs: false,
    enableDA: false,
    daYears: 5,
  },

  bfr: { daysOfRevenue: 0 },
  openingCash: 0,
};

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
