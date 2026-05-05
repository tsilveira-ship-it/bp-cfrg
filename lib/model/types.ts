export const HORIZON_MONTHS = 60;
export const FY_LABELS = ["FY25", "FY26", "FY27", "FY28", "FY29"] as const;
export const FY_START_MONTH_INDEX = 0; // model month 0 = Sept 2025

export const MONTH_LABELS_FR = [
  "Sept 25","Oct 25","Nov 25","Déc 25","Janv 26","Févr 26","Mars 26","Avr 26","Mai 26","Juin 26","Juil 26","Août 26",
  "Sept 26","Oct 26","Nov 26","Déc 26","Janv 27","Févr 27","Mars 27","Avr 27","Mai 27","Juin 27","Juil 27","Août 27",
  "Sept 27","Oct 27","Nov 27","Déc 27","Janv 28","Févr 28","Mars 28","Avr 28","Mai 28","Juin 28","Juil 28","Août 28",
  "Sept 28","Oct 28","Nov 28","Déc 28","Janv 29","Févr 29","Mars 29","Avr 29","Mai 29","Juin 29","Juil 29","Août 29",
  "Sept 29","Oct 29","Nov 29","Déc 29","Janv 30","Févr 30","Mars 30","Avr 30","Mai 30","Juin 30","Juil 30","Août 30",
];

export type SubscriptionTier = {
  id: string;
  name: string;
  monthlyPrice: number;
  mixPct: number; // 0..1, share of new subs
};

export type SalaryItem = {
  id: string;
  role: string;
  monthlyGross: number;
  fte: number;
  startMonth: number; // model month index (0-59) when role activates
  fy26Bump?: number; // explicit FY26 monthly value override
};

export type RecurringExpense = {
  id: string;
  name: string;
  monthly: number;
  category: "entretien" | "frais_op" | "marketing" | "provision";
};

export type OneOffExpense = {
  id: string;
  name: string;
  amount: number;
  month: number; // 0-11 within a year (Sept=0)
  yearly: boolean; // recurs every year
};

export type ModelParams = {
  // Revenue: new subscriptions
  subs: {
    tiers: SubscriptionTier[];
    vatRate: number; // TVA, ex: 0.20. Revenue model uses HT = TTC / (1+vatRate)
    rampStartCount: number; // total new subs in Sept 25
    rampEndCount: number; // total new subs in Aug 26 (last month FY25)
    fy26GrowthPct: number;
    fy27GrowthPct: number;
    fy28GrowthPct: number;
    fy29GrowthPct: number;
    priceIndexPa: number; // annual price increase % (FY26+)
  };

  // Legacy Javelot members (declining)
  legacy: {
    startCount: number; // Sept 25
    avgMonthlyPrice: number;
    yearlyChurnAbs: number; // members lost per year (linear monthly)
  };

  // Complementary services
  prestations: {
    teen: { price: number; startCount: number; growthPa: number };
    senior: { price: number; startCount: number; growthPa: number };
    horsAbo: { monthlyAvg: number; growthPa: number };
  };

  // Merchandising
  merch: { monthlyMargin: number; growthPa: number };

  // Salaries
  salaries: {
    items: SalaryItem[];
    annualIndexPa: number; // % annual réévaluation (applied each new FY)
    chargesPatroPct: number; // already included in monthlyGross? if yes set 0
  };

  // Rent
  rent: {
    monthlyByFy: number[]; // length 5
    yearlyTaxes: number; // taxes month (Aug)
    monthlyCoopro: number;
  };

  // Recurring opex
  recurring: RecurringExpense[];

  // One-off prestataires (annual recurrence)
  oneOffs: OneOffExpense[];

  // Marketing
  marketing: {
    monthlyBudget: number;
    indexPa: number;
    pctOfRevenue: number; // if >0, additional marketing scaled with CA
  };

  // Provisions
  provisions: { monthlyEquipement: number; monthlyTravaux: number; indexPa: number };

  // Investment (one-time, FY25)
  capex: { equipment: number; travaux: number; juridique: number; depots: number };

  // Financing
  financing: {
    fundraise: number; // equity round received month 0
    loanMonthly: number; // mensualité (capital+intérêt+assurance)
    loanDurationMonths: number;
    bondMonthly: number; // intérêts coupon
    bondCapitalRepayMonthly: number; // remboursement capital obligation
    bondDurationMonths: number;
  };

  // Tax & accounting
  tax: {
    isRate: number; // taux IS
    enableIs: boolean;
    enableDA: boolean; // dotations aux amortissements
    daYears: number;
  };

  // Working capital
  bfr: {
    daysOfRevenue: number;
  };

  // Initial cash
  openingCash: number;
};

export type MonthlyComputed = {
  month: number;
  label: string;
  fy: number; // 0..4
  // Revenue lines
  subsCount: number;
  subsRevenue: number;
  legacyCount: number;
  legacyRevenue: number;
  prestationsRevenue: number;
  merchRevenue: number;
  totalRevenue: number;
  // Cost lines
  salaries: number;
  rent: number;
  recurringEntretien: number;
  recurringFraisOp: number;
  marketing: number;
  provisions: number;
  oneOff: number;
  totalOpex: number;
  // P&L
  ebitda: number;
  da: number;
  ebit: number;
  interestExpense: number;
  pbt: number;
  tax: number;
  netIncome: number;
  // CF
  capex: number;
  bfrChange: number;
  loanPrincipalRepay: number;
  bondPrincipalRepay: number;
  fundraise: number;
  cfo: number;
  cfi: number;
  cff: number;
  netCashFlow: number;
  cashBalance: number;
};

export type YearlyComputed = {
  fy: number;
  label: string;
  totalRevenue: number;
  subsRevenue: number;
  legacyRevenue: number;
  prestationsRevenue: number;
  merchRevenue: number;
  totalOpex: number;
  salaries: number;
  rent: number;
  recurring: number;
  marketing: number;
  provisions: number;
  oneOff: number;
  ebitda: number;
  ebitdaMargin: number;
  da: number;
  ebit: number;
  interestExpense: number;
  pbt: number;
  tax: number;
  netIncome: number;
  capex: number;
  cfo: number;
  cfi: number;
  cff: number;
  netCashFlow: number;
  cashEnd: number;
  growthPct: number;
};

export type ModelResult = {
  monthly: MonthlyComputed[];
  yearly: YearlyComputed[];
  breakEvenMonth: number | null;
  cashTroughMonth: number | null;
  cashTroughValue: number;
  irr5y: number | null;
  fcfTotal: number;
};
