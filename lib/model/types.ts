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

export type ShareholderType = "founder" | "investor" | "employee" | "advisor" | "pool";

export type Shareholder = {
  id: string;
  name: string;
  type: ShareholderType;
  shares: number;
  notes?: string;
};

/** Événement de dilution (levée future, option pool, etc.) — appliqué si active=true. */
export type DilutionEvent = {
  id: string;
  name: string;
  newSharesIssued: number;
  pricePerShare?: number;     // valorisation €/part (post-money implicite)
  beneficiary?: string;       // nom de l'actionnaire qui reçoit (créé si inexistant)
  beneficiaryType?: ShareholderType;
  active: boolean;
};

export type CapexItem = {
  id: string;
  name: string;
  category: "equipment" | "travaux" | "juridique" | "depots";
  amount: number;
  amortYears: number;     // 0 = non amorti
};

/** Espace d'entraînement (ex Espace A 14 places, Espace B 12 places). */
export type GymArea = {
  id: string;
  name: string;
  capacity: number;       // nb membres simultanés dans cet espace
};

/** Planning hebdomadaire de base (à scaler par FY). */
export type WeeklySchedule = {
  weekdayClassesPerArea: number;   // cours par jour ouvré dans chaque espace (ex 5)
  weekendClassesPerArea: number;   // cours par jour weekend dans chaque espace (ex 3)
  hoursPerClass: number;            // durée d'un cours en heures (ex 1)
};

/** Allocation d'heures à un coach (cadre ou pool freelance) sur un FY. */
export type CoachAllocation = {
  id: string;
  fy: number;                        // FY index (0 = première année)
  coachKind: "cadre" | "freelance";
  coachId: string;                   // référence à salaries.items[].id ou freelancePools[].id
  hoursPerMonth: number;             // heures allouées / mois
};

/** Validation 4-eyes par champ — exige 2 admins distincts pour atteindre le niveau 2. */
export type FieldValidationStamp = {
  admin: string;          // email de l'admin
  date: string;           // ISO timestamp
  value: unknown;         // valeur figée au moment de la validation (pour invalidation auto si changement)
};

export type FieldValidation = {
  level1?: FieldValidationStamp;  // 1ère validation
  level2?: FieldValidationStamp;  // 2nde validation par un admin différent
  /** Flag manuel "à revoir" — indépendant des validations, mis par n'importe qui. */
  flagged?: { by: string; date: string; reason?: string };
};

/** Q&A inline par champ — thread de commentaires entre fondateur et analyste/investisseur. */
export type FieldComment = {
  id: string;
  author?: string;       // email de l'auteur
  date: string;          // ISO
  text: string;
  resolved?: boolean;    // marquer la question comme traitée
};

export type FieldQA = {
  comments: FieldComment[];
};

/** Réel observé pour un mois donné — pour comparaison réel vs prévu (#20). */
export type ActualEntry = {
  monthIso: string;             // YYYY-MM (ex: "2026-09" pour Sept 2026 = M0 si FY26)
  revenue?: number;
  salaries?: number;
  rent?: number;
  recurring?: number;           // entretien + frais op
  marketing?: number;
  other?: number;               // autres OPEX
  cashEnd?: number;
  notes?: string;
};

export type FieldNote = {
  note: string;
  author?: string;        // email auteur de la note (si dispo)
  date: string;           // ISO timestamp dernière édition
};

export type SubscriptionTier = {
  id: string;
  name: string;
  monthlyPrice: number;
  /** Part du tier dans le mix de revenus (somme = 1.0). */
  mixPct: number;
  /**
   * Churn mensuel spécifique au tier (override). Si undefined, fallback sur
   * `subs.monthlyChurnPct` global. Permet de modéliser des rétentions
   * différenciées : illimité ~1.5%/mo, 4 séances ~4%/mo, etc.
   */
  monthlyChurnPct?: number;
  /**
   * Part du tier dans le mix d'acquisitions (somme = 1.0). Si undefined,
   * fallback sur `mixPct`. Permet de modéliser une trajectoire où le mix
   * d'acquisition diffère du mix de stock (ex : on acquiert plus de drop-in
   * mais ils churnent vite).
   */
  acquisitionMixPct?: number;
};

export type SalaryCategory = "cadre" | "non-cadre" | "apprenti" | "stagiaire";

export type SalaryItem = {
  id: string;
  role: string;
  monthlyGross: number;             // brut mensuel
  fte: number;
  startMonth: number;
  endMonth?: number;                 // mois inclusif de départ (par défaut horizonMonths-1)
  category?: SalaryCategory;
  thirteenthMonth?: boolean;         // 13e mois (ajoute brut/12)
  yearlyBonus?: number;              // prime annuelle €
  mutuelle?: number;                 // €/mois employeur
  transport?: number;                // €/mois remboursement employeur
  ticketsResto?: number;             // €/mois part employeur
  annualRaisePct?: number;           // override % indexation annuelle pour ce poste
  fy26Bump?: number;                 // legacy: override brut FY26
};

export type ChargesProfile = {
  category: SalaryCategory;
  patroPct: number;                  // taux charges patronales (ex 0.42 cadre)
  salaryPct: number;                 // taux charges salariales (informatif)
};

export const DEFAULT_CHARGES: ChargesProfile[] = [
  { category: "cadre", patroPct: 0.42, salaryPct: 0.22 },
  { category: "non-cadre", patroPct: 0.40, salaryPct: 0.22 },
  { category: "apprenti", patroPct: 0.10, salaryPct: 0 },
  { category: "stagiaire", patroPct: 0, salaryPct: 0 },
];

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

export function getPatroPct(item: SalaryItem, profiles: ChargesProfile[] | undefined, fallback: number): number {
  if (!item.category || !profiles) return fallback;
  const p = profiles.find((pr) => pr.category === item.category);
  return p?.patroPct ?? fallback;
}

export function monthlyEmployerCost(item: SalaryItem, profiles: ChargesProfile[] | undefined, fallbackPatro: number, indexFactor: number, fy: number): number {
  // Brut effectif: legacy fy26Bump si défini et fy >= 1, sinon monthlyGross indexé
  let baseGross = item.monthlyGross;
  if (fy >= 1 && item.fy26Bump !== undefined) baseGross = item.fy26Bump;
  // Indexation propre au poste si définie, sinon globale
  const idx = item.annualRaisePct !== undefined
    ? Math.pow(1 + item.annualRaisePct, Math.max(0, fy - 1))
    : indexFactor;
  const grossThisMonth = baseGross * idx;

  const patro = getPatroPct(item, profiles, fallbackPatro);
  let totalEmployer = grossThisMonth * (1 + patro);

  if (item.thirteenthMonth) totalEmployer += (grossThisMonth * (1 + patro)) / 12;
  if (item.yearlyBonus) totalEmployer += (item.yearlyBonus * (1 + patro)) / 12;
  if (item.mutuelle) totalEmployer += item.mutuelle;
  if (item.transport) totalEmployer += item.transport;
  if (item.ticketsResto) totalEmployer += item.ticketsResto;

  return totalEmployer * item.fte;
}

/** Retourne la liste effective des postes CAPEX (capexItems si défini, sinon 4 postes globaux). */
export function expandCapex(p: { capex: { equipment: number; travaux: number; juridique: number; depots: number }; capexItems?: CapexItem[]; tax: { amortYearsEquipment?: number; amortYearsTravaux?: number; daYears: number } }): CapexItem[] {
  if (p.capexItems && p.capexItems.length > 0) return p.capexItems;
  const yEquip = p.tax.amortYearsEquipment ?? p.tax.daYears ?? 5;
  const yTrav = p.tax.amortYearsTravaux ?? Math.max(p.tax.daYears ?? 10, 10);
  return [
    { id: "_equip", name: "Équipement (global)", category: "equipment", amount: p.capex.equipment, amortYears: yEquip },
    { id: "_trav", name: "Travaux (global)", category: "travaux", amount: p.capex.travaux, amortYears: yTrav },
    { id: "_jur", name: "Juridique & frais création", category: "juridique", amount: p.capex.juridique, amortYears: 0 },
    { id: "_dep", name: "Dépôts de garantie", category: "depots", amount: p.capex.depots, amortYears: 0 },
  ];
}

// Conversion approximative net → brut (charges salariales par défaut 22%)
export function netToGross(net: number, salaryPct = 0.22): number {
  return net / (1 - salaryPct);
}

// Conversion brut → coût employeur
export function grossToCost(gross: number, patroPct = 0.42): number {
  return gross * (1 + patroPct);
}

// Conversion coût employeur → brut
export function costToGross(cost: number, patroPct = 0.42): number {
  return cost / (1 + patroPct);
}

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
    /**
     * NET target counts (acquis - churnés). Si cohortModel.enabled=false (default),
     * la trajectoire `count[m]` est interpolée linéairement entre rampStartCount et rampEndCount,
     * puis croissance par FY via `growthRates`. Le churn n'est PAS appliqué au stock (sinon
     * double-comptage). `monthlyChurnPct` reste utilisé par les métriques LTV/CAC.
     */
    rampStartCount: number;
    rampEndCount: number;
    growthRates: number[];   // length = horizonYears - 1, growth from prev FY end
    priceIndexPa: number;
    seasonality?: number[];           // 12 multipliers (Sept..Août). Default tous 1.
    monthlyChurnPct?: number;         // % membres perdu chaque mois (cohort retention)
    /**
     * Cohort model — si enabled=true, le calcul `count[m]` devient
     * count[m] = Σ_{k=0..m} acquisitions[k] × retention(m-k).
     * Par défaut retention(t) = (1 - monthlyChurnPct)^t (exponentielle).
     * Si `retentionCurve` est défini, retention(t) suit la courbe exacte (Niveau 3).
     * `acquisitions[m]` est dérivé d'une trajectoire d'acquisitions brutes mensuelles,
     * pas du target NET. Remplace alors le ramp/growth/seasonality du mode legacy.
     */
    cohortModel?: {
      enabled: boolean;
      /** Acquisitions brutes/mois — début FY26 (mois 0). */
      acquisitionStart: number;
      /** Acquisitions brutes/mois — fin FY26 (mois 11). */
      acquisitionEnd: number;
      /** Croissance annuelle du taux d'acquisition mensuel post-FY26. Length = horizonYears - 1. */
      acquisitionGrowthByFy: number[];
      /** Saisonnalité appliquée aux acquisitions (12 multiplicateurs Sept..Août). Default = subs.seasonality. */
      acquisitionSeasonality?: number[];
      /**
       * Niveau 3 — courbe de rétention non-exponentielle (override).
       * Tableau retention[t] = % cohorte survivant t mois après acquisition.
       * Position 0 = mois 0 (=1.0). Position N = mois N. Au-delà du dernier
       * point connu, on extrapole linéairement avec la pente moyenne des
       * 6 derniers points (ou steady-state si plat).
       * Si défini, override la formule exponentielle (1 - churn)^t.
       */
      retentionCurve?: number[];
    };
  };

  notes?: Record<string, string>;     // notes textuelles libres par scénario
  fieldNotes?: Record<string, FieldNote>; // annotations par champ (path → note + auteur + date)
  fieldQA?: Record<string, FieldQA>;  // threads Q&A par champ (#10)
  fieldValidations?: Record<string, FieldValidation>; // validation 4-eyes par champ
  actuals?: ActualEntry[];            // réels mensuels observés (#20)

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
    chargesProfiles?: ChargesProfile[];
  };

  rent: {
    monthlyByFy: number[];   // length = horizonYears
    yearlyTaxes: number;
    monthlyCoopro: number;
    franchiseMonths?: number;  // # mois de franchise au démarrage (loyer offert) — default 0
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
  capexItems?: CapexItem[];               // détail par poste (durées d'amort spécifiques). Si défini, override des pools globaux.

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
    daYears: number;                  // legacy fallback
    amortYearsEquipment?: number;     // default 5
    amortYearsTravaux?: number;       // default 10
    // #4 Reprise déficits fiscaux
    enableLossCarryForward?: boolean; // default true: reporte les pertes des FY précédents
    // #5 TVA
    enableVat?: boolean;              // default false (n'altère pas P&L existant)
    vatRate?: number;                 // taux TVA (ex 0.20). Défaut p.subs.vatRate
    vatDeductibleOpexPct?: number;    // % OPEX avec TVA déductible (default 0.5 — exclut salaires)
    // #6 Échéancier IS
    isPaymentSchedule?: "monthly" | "quarterly"; // default "monthly"
  };

  // #8 BFR détaillé (optionnel — si défini, override `daysOfRevenue`)
  bfr: {
    daysOfRevenue: number;            // legacy: BFR net en jours de CA
    daysReceivables?: number;         // créances clients (Square: 3j typique)
    daysSupplierPayables?: number;    // dettes fournisseurs (30j typique)
    daysStock?: number;               // stock (0 typique en service)
  };

  /** Cap table actionnariat (#15) — actionnaires + événements dilution simulés. */
  capTable?: {
    shareholders: Shareholder[];
    events: DilutionEvent[];
  };

  /** Capacité opérationnelle (cours en parallèle, capacité par cours, fréquence membres). */
  capacity?: {
    parallelClasses: number;          // nb de cours simultanés par créneau (ex 2)
    capacityPerClass: number;         // capacité moyenne par cours (ex 14)
    capacityPerClassMin?: number;     // borne basse (ex 12)
    capacityPerClassMax?: number;     // borne haute (ex 16)
    avgSessionsPerMonth: number;      // sessions/membre/mois moyennes (ex 8)
    // Planificateur détaillé (optionnel — utilisé par /capacity-planner)
    areas?: GymArea[];                // espaces d'entraînement avec capacité propre
    weeklySchedule?: WeeklySchedule;  // nb cours/jour × type de jour × durée
    scaleByFy?: number[];             // multiplicateur du planning par FY (length = horizonYears)
    coachAllocations?: CoachAllocation[]; // heures allouées par cadre/pool (par FY)
  };

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
  tax: number;                  // charge IS comptable (P&L)
  taxCash: number;              // décaissement IS effectif (selon échéancier mensuel/trimestriel)
  lossCarryForwardBalance: number; // solde déficits reportables fin de mois
  lossUsedThisMonth: number;    // déficit utilisé pour réduire base imposable ce mois
  vatCollected: number;         // TVA collectée sur ventes (info)
  vatDeductible: number;        // TVA déductible sur achats (info)
  vatNetPayable: number;        // TVA nette à payer (cumul du trimestre, payé aux mois d'échéance)
  vatCashOut: number;           // décaissement TVA effectif ce mois
  netIncome: number;
  capex: number;
  bfrChange: number;
  loanPrincipalRepay: number;
  bondPrincipalRepay: number;
  capitalizedInterest: number;       // PIK accrued (non-cash) ce mois
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
  taxCash: number;
  lossCarryForwardBalanceEnd: number; // solde déficits reportables fin FY
  lossUsedThisYear: number;
  taxableIncomeAfterCarryForward: number; // base imposable après imputation déficits
  vatCollected: number;
  vatDeductible: number;
  vatNetPayable: number;
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
