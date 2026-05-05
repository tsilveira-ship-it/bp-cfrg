// Calendar helpers
const FR_MONTHS = ["Sept", "Oct", "Nov", "Déc", "Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août"];

export function buildTimeline(startYear: number, horizonYears: number) {
  const horizonMonths = horizonYears * 12;
  const monthLabels: string[] = [];
  const fyLabels: string[] = [];
  for (let i = 0; i < horizonYears; i++) {
    fyLabels.push(`FY${(startYear + i) % 100}`);
  }
  for (let i = 0; i < horizonMonths; i++) {
    const fyIdx = Math.floor(i / 12);
    const monthIdx = i % 12;
    const fr = FR_MONTHS[monthIdx];
    // Jan-Aug fall in next calendar year
    const calYear = startYear + fyIdx + (monthIdx >= 4 ? 1 : 0);
    monthLabels.push(`${fr} ${String(calYear).slice(-2)}`);
  }
  return { startYear, horizonYears, horizonMonths, monthLabels, fyLabels };
}

// Legacy export kept for components that did not migrate yet
export const FY_LABELS_LEGACY = ["FY25", "FY26", "FY27", "FY28", "FY29"] as const;

export type SubscriptionTier = {
  id: string;
  name: string;
  monthlyPrice: number;
  mixPct: number;
};

export type SalaryItem = {
  id: string;
  role: string;
  monthlyGross: number;
  fte: number;
  startMonth: number;
  fy26Bump?: number;
};

export type FreelancePool = {
  id: string;
  name: string;
  hourlyRate: number;
  monthlyHours: number;
  // Si défini, monthlyHours = (hoursPerWeekday × 5 + hoursPerWeekendDay × 2) × WEEKS_PER_MONTH
  hoursPerWeekday?: number;
  hoursPerWeekendDay?: number;
  startMonth?: number;
};

export const WEEKS_PER_MONTH = 4.3;

export function effectiveMonthlyHours(pool: FreelancePool): number {
  if (pool.hoursPerWeekday !== undefined && pool.hoursPerWeekendDay !== undefined) {
    return (pool.hoursPerWeekday * 5 + pool.hoursPerWeekendDay * 2) * WEEKS_PER_MONTH;
  }
  return pool.monthlyHours;
}

export type BondIssue = {
  id: string;
  name: string;
  principal: number;
  annualRatePct: number;
  termYears: number;
  frequency: 1 | 2 | 4; // annuel, semestriel, trimestriel
  amortization: "bullet" | "linear";
  deferralYears: number;
  capitalizeInterest: boolean;       // PIK pendant différé
  startMonth: number;                // 0..horizonMonths-1, défaut 0
};

export type LoanLine = {
  id: string;
  name: string;
  principal: number;
  annualRatePct: number;
  termMonths: number;
  startMonth: number;
};

export type EquityLine = {
  id: string;
  name: string;
  amount: number;
  startMonth: number;
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
  month: number;
  yearly: boolean;
};

export type ModelParams = {
  // Timeline
  timeline: {
    startYear: number;       // ex: 2026 → premier mois = Sept 2026
    horizonYears: number;    // 3..10
  };

  // Revenue: new subscriptions
  subs: {
    tiers: SubscriptionTier[];
    vatRate: number;
    rampStartCount: number;
    rampEndCount: number;
    growthRates: number[];   // length = horizonYears - 1, growth from prev FY end
    priceIndexPa: number;
  };

  legacy: {
    startCount: number;
    avgMonthlyPrice: number;
    yearlyChurnAbs: number;
  };

  prestations: {
    teen: { price: number; startCount: number; growthPa: number };
    senior: { price: number; startCount: number; growthPa: number };
    horsAbo: { monthlyAvg: number; growthPa: number };
  };

  merch: { monthlyMargin: number; growthPa: number };

  salaries: {
    items: SalaryItem[];
    freelancePools: FreelancePool[];
    annualIndexPa: number;
    chargesPatroPct: number;
  };

  rent: {
    monthlyByFy: number[];   // length = horizonYears
    yearlyTaxes: number;
    monthlyCoopro: number;
  };

  recurring: RecurringExpense[];
  oneOffs: OneOffExpense[];

  marketing: {
    monthlyBudget: number;
    indexPa: number;
    pctOfRevenue: number;
  };

  provisions: { monthlyEquipement: number; monthlyTravaux: number; indexPa: number };

  capex: { equipment: number; travaux: number; juridique: number; depots: number };

  financing: {
    // Apports / equity (M0 ou en plusieurs tranches)
    equity: EquityLine[];
    // Emprunts bancaires amortissables
    loans: LoanLine[];
    // Émissions obligataires (peuvent être multiples)
    bonds: BondIssue[];

    // Legacy (lecture seule, conservés pour normalisation depuis anciens scénarios)
    fundraise?: number;
    loanMonthly?: number;
    loanDurationMonths?: number;
    bondMonthly?: number;
    bondCapitalRepayMonthly?: number;
    bondDurationMonths?: number;
  };

  tax: {
    isRate: number;
    enableIs: boolean;
    enableDA: boolean;
    daYears: number;
  };

  bfr: { daysOfRevenue: number };
  openingCash: number;
};

export type MonthlyComputed = {
  month: number;
  label: string;
  fy: number;
  subsCount: number;
  subsRevenue: number;
  legacyCount: number;
  legacyRevenue: number;
  prestationsRevenue: number;
  merchRevenue: number;
  totalRevenue: number;
  salaries: number;
  rent: number;
  recurringEntretien: number;
  recurringFraisOp: number;
  marketing: number;
  provisions: number;
  oneOff: number;
  totalOpex: number;
  ebitda: number;
  da: number;
  ebit: number;
  interestExpense: number;
  pbt: number;
  tax: number;
  netIncome: number;
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
  startYear: number;
  horizonYears: number;
  horizonMonths: number;
  fyLabels: string[];
  monthLabels: string[];
};

// Migration helper: takes a possibly-legacy params object and returns a normalized one.
export function normalizeParams(p: any): ModelParams {
  const timeline = p.timeline ?? { startYear: 2026, horizonYears: 7 };

  // Subs growth: convert legacy fy26..fy29 to growthRates if missing
  let growthRates: number[] = p.subs?.growthRates;
  if (!Array.isArray(growthRates)) {
    growthRates = [
      p.subs?.fy26GrowthPct ?? 0.30,
      p.subs?.fy27GrowthPct ?? 0.25,
      p.subs?.fy28GrowthPct ?? 0.20,
      p.subs?.fy29GrowthPct ?? 0.15,
    ];
  }
  // Pad/truncate to horizonYears - 1
  const targetGrowthLen = Math.max(0, timeline.horizonYears - 1);
  if (growthRates.length < targetGrowthLen) {
    const last = growthRates[growthRates.length - 1] ?? 0.10;
    while (growthRates.length < targetGrowthLen) growthRates.push(last);
  } else if (growthRates.length > targetGrowthLen) {
    growthRates = growthRates.slice(0, targetGrowthLen);
  }

  // Rent monthlyByFy: pad/truncate
  let rentArr: number[] = p.rent?.monthlyByFy ?? [];
  if (rentArr.length < timeline.horizonYears) {
    const last = rentArr[rentArr.length - 1] ?? 12500;
    while (rentArr.length < timeline.horizonYears) rentArr.push(last);
  } else if (rentArr.length > timeline.horizonYears) {
    rentArr = rentArr.slice(0, timeline.horizonYears);
  }

  // Financing migration
  const fin = p.financing ?? {};
  const equity: EquityLine[] = Array.isArray(fin.equity)
    ? fin.equity
    : fin.fundraise
    ? [{ id: "legacy_eq", name: "Levée de fonds", amount: fin.fundraise, startMonth: 0 }]
    : [];

  const loans: LoanLine[] = Array.isArray(fin.loans)
    ? fin.loans
    : fin.loanMonthly && fin.loanDurationMonths
    ? [
        // Reverse-engineer principal from monthly + duration assuming ~3% rate
        {
          id: "legacy_loan",
          name: "Emprunt bancaire",
          principal: fin.loanMonthly * fin.loanDurationMonths * 0.93,
          annualRatePct: 3,
          termMonths: fin.loanDurationMonths,
          startMonth: 0,
        },
      ]
    : [];

  const bonds: BondIssue[] = Array.isArray(fin.bonds)
    ? fin.bonds
    : fin.bondMonthly && fin.bondDurationMonths
    ? [
        {
          id: "legacy_bond",
          name: "Obligation",
          principal: (fin.bondCapitalRepayMonthly ?? 6666.67) * fin.bondDurationMonths,
          annualRatePct: ((fin.bondMonthly * 12) / ((fin.bondCapitalRepayMonthly ?? 6666.67) * fin.bondDurationMonths)) * 100,
          termYears: fin.bondDurationMonths / 12,
          frequency: 12,
          amortization: "linear" as const,
          deferralYears: 0,
          capitalizeInterest: false,
          startMonth: 0,
        } as unknown as BondIssue,
      ]
    : [];

  return {
    ...p,
    timeline,
    subs: {
      ...p.subs,
      vatRate: p.subs?.vatRate ?? 0.20,
      growthRates,
    },
    rent: {
      ...p.rent,
      monthlyByFy: rentArr,
    },
    salaries: {
      ...p.salaries,
      freelancePools: p.salaries?.freelancePools ?? [],
    },
    financing: { ...fin, equity, loans, bonds },
  };
}
