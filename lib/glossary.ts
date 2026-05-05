export type GlossaryCategory =
  | "P&L"
  | "Cashflow"
  | "Bilan"
  | "Investisseur"
  | "SaaS/Fitness"
  | "Fiscalité"
  | "Financement"
  | "Capacité";

export type GlossaryTerm = {
  term: string;
  acronym?: string;
  category: GlossaryCategory;
  definition: string;
  example?: string;
  formula?: string;
  benchmark?: string;
};

export const GLOSSARY: GlossaryTerm[] = [
  // P&L
  {
    term: "EBITDA",
    acronym: "Earnings Before Interest, Taxes, Depreciation, Amortization",
    category: "P&L",
    definition:
      "Résultat opérationnel avant intérêts, impôts et amortissements. Proxy de la rentabilité opérationnelle pure.",
    formula: "EBITDA = CA − OPEX (hors D&A)",
    example: "Si CA = 1M€ et OPEX = 800k€, EBITDA = 200k€ (marge 20%).",
    benchmark: "Boxes CrossFit matures: 15-25%. Salles fitness chaînes: 20-30%.",
  },
  {
    term: "EBIT",
    acronym: "Earnings Before Interest and Taxes",
    category: "P&L",
    definition:
      "Résultat d'exploitation après amortissements mais avant intérêts et impôts.",
    formula: "EBIT = EBITDA − D&A",
  },
  {
    term: "Marge EBITDA",
    category: "P&L",
    definition: "Pourcentage du CA qui reste après les charges opérationnelles.",
    formula: "Marge EBITDA = EBITDA / CA",
    benchmark: "<10% = tension, 15-25% = sain, >30% = excellent.",
  },
  {
    term: "PBT",
    acronym: "Profit Before Tax",
    category: "P&L",
    definition: "Bénéfice avant impôts. Base imposable comptable (avant carry-forward).",
    formula: "PBT = EBIT − Intérêts",
  },
  {
    term: "Résultat net",
    category: "P&L",
    definition: "Bénéfice après impôts. Ce qui reste pour les actionnaires.",
    formula: "Net = PBT − Impôts",
  },
  {
    term: "OPEX",
    acronym: "Operating Expenditure",
    category: "P&L",
    definition: "Charges opérationnelles courantes (salaires, loyer, marketing, etc.).",
  },
  {
    term: "CAPEX",
    acronym: "Capital Expenditure",
    category: "P&L",
    definition:
      "Dépenses d'investissement (équipement, travaux, dépôts) capitalisées et amorties sur plusieurs années.",
    benchmark: "Box CrossFit ouverture: 80-200k€ équipement + 100-300k€ travaux selon surface.",
  },
  {
    term: "D&A",
    acronym: "Depreciation & Amortization",
    category: "P&L",
    definition:
      "Dotation aux amortissements: étalement comptable du coût d'un actif sur sa durée de vie.",
    formula: "D&A monthly = Σ (CAPEX item / amort_years × 12)",
    example: "Équipement 60k€ amorti sur 5 ans → 1k€/mois D&A.",
  },

  // Cashflow
  {
    term: "CFO",
    acronym: "Cash Flow from Operations",
    category: "Cashflow",
    definition: "Trésorerie générée par l'exploitation (avant CAPEX et financement).",
    formula: "CFO = EBITDA − Impôts cash − ΔBFR",
  },
  {
    term: "CFI",
    acronym: "Cash Flow from Investing",
    category: "Cashflow",
    definition: "Flux de trésorerie liés aux investissements (CAPEX).",
    formula: "CFI = −CAPEX",
  },
  {
    term: "CFF",
    acronym: "Cash Flow from Financing",
    category: "Cashflow",
    definition: "Flux de trésorerie liés au financement (apports, emprunts, intérêts).",
    formula: "CFF = Apports − Remboursements − Intérêts",
  },
  {
    term: "FCF",
    acronym: "Free Cash Flow",
    category: "Cashflow",
    definition: "Cash disponible après CAPEX, avant remboursement de dette.",
    formula: "FCF = CFO + CFI",
  },
  {
    term: "BFR",
    acronym: "Besoin en Fonds de Roulement",
    category: "Cashflow",
    definition:
      "Capital requis pour financer l'écart entre encaissements et décaissements (créances - dettes fournisseurs + stock).",
    formula: "BFR = Créances clients − Dettes fournisseurs + Stock",
    benchmark: "Box CrossFit: 0-10j de CA (paiement Square ~3j, peu de fournisseurs).",
  },
  {
    term: "Break-even",
    category: "Cashflow",
    definition: "Mois à partir duquel l'EBITDA cumulé devient positif (atteinte de la rentabilité).",
    benchmark: "Box mature: 12-18 mois. Si > 24 mois → réviser le ramp-up.",
  },
  {
    term: "Creux de trésorerie",
    category: "Cashflow",
    definition:
      "Solde minimum de trésorerie atteint sur l'horizon. Si négatif, la levée est insuffisante.",
  },

  // Bilan
  {
    term: "Capitaux propres",
    category: "Bilan",
    definition: "Fonds propres = apports actionnaires + résultats cumulés non distribués.",
    formula: "Capitaux propres = Equity + Σ Résultats nets",
  },
  {
    term: "Immobilisations",
    category: "Bilan",
    definition: "Actifs durables capitalisés (équipement, travaux, dépôts).",
  },
  {
    term: "Immo nettes",
    category: "Bilan",
    definition: "Immobilisations brutes − amortissements cumulés.",
  },
  {
    term: "Dette financière",
    category: "Bilan",
    definition: "Encours total des emprunts bancaires + obligations.",
  },

  // Investisseur
  {
    term: "IRR",
    acronym: "Internal Rate of Return",
    category: "Investisseur",
    definition:
      "Taux de rentabilité interne d'un investissement. Taux d'actualisation qui rend la NPV nulle.",
    benchmark: "VC early-stage: 25-40%. Banque: ~6-10%. PME stable: 15-20%.",
  },
  {
    term: "NPV",
    acronym: "Net Present Value",
    category: "Investisseur",
    definition: "Valeur actuelle nette des flux futurs actualisés à un taux donné.",
    formula: "NPV = Σ (CF_t / (1 + r)^t)",
  },
  {
    term: "Payback",
    category: "Investisseur",
    definition:
      "Durée nécessaire pour récupérer l'investissement initial via les cash flows futurs.",
    benchmark: "Acceptable < 4 ans pour PME, < 7 ans pour projets infrastructure.",
  },
  {
    term: "Multiple",
    category: "Investisseur",
    definition: "Ratio EBITDA × multiplicateur sectoriel pour estimer une valorisation de sortie.",
    benchmark: "Boxes fitness: 4-6× EBITDA. SaaS: 5-15× ARR.",
  },
  {
    term: "DSCR",
    acronym: "Debt Service Coverage Ratio",
    category: "Investisseur",
    definition: "Capacité à rembourser le service de la dette via le cash généré.",
    formula: "DSCR = CFO / (Principal + Intérêts annuels)",
    benchmark: "Banque exige généralement DSCR > 1.2-1.5.",
  },
  {
    term: "Pre-money / Post-money",
    category: "Investisseur",
    definition:
      "Valorisation avant (pre) ou après (post) une levée de fonds. Post = Pre + Montant levé.",
  },
  {
    term: "Dilution",
    category: "Investisseur",
    definition:
      "Réduction du % de détention d'un actionnaire suite à émission de nouvelles parts (levée, BSPCE).",
  },
  {
    term: "Cap table",
    category: "Investisseur",
    definition: "Tableau de répartition du capital (qui détient combien de parts).",
  },

  // SaaS / Fitness
  {
    term: "LTV",
    acronym: "Lifetime Value",
    category: "SaaS/Fitness",
    definition: "Valeur totale d'un abonné sur sa durée de vie.",
    formula: "LTV = ARPU mensuel × Durée moyenne (1/churn)",
    benchmark: "CrossFit: 24-36 mois × ~150€ = 3.6-5.4k€.",
  },
  {
    term: "CAC",
    acronym: "Customer Acquisition Cost",
    category: "SaaS/Fitness",
    definition: "Coût moyen pour acquérir un nouveau client.",
    formula: "CAC = Marketing total / Nb nouveaux clients",
    benchmark: "Fitness B2C Paris: 80-150€ par membre.",
  },
  {
    term: "LTV/CAC",
    category: "SaaS/Fitness",
    definition: "Ratio rentabilité de l'acquisition. Plus c'est haut, mieux c'est.",
    benchmark: "> 3 = sain, > 5 = excellent, < 1 = perte sèche.",
  },
  {
    term: "Churn",
    category: "SaaS/Fitness",
    definition: "Taux d'attrition mensuel ou annuel des abonnés.",
    benchmark: "Fitness chaîne: 3-5%/mois. CrossFit communauté: 1.5-3%/mois.",
  },
  {
    term: "ARPU",
    acronym: "Average Revenue Per User",
    category: "SaaS/Fitness",
    definition: "Revenu moyen mensuel par abonné.",
  },
  {
    term: "Ramp-up",
    category: "SaaS/Fitness",
    definition: "Montée en charge progressive des abonnements jusqu'à la maturité.",
  },
  {
    term: "Cohort retention",
    category: "SaaS/Fitness",
    definition:
      "Suivi du % d'abonnés qui restent actifs N mois après leur acquisition (cohorte).",
  },

  // Fiscalité
  {
    term: "IS",
    acronym: "Impôt sur les Sociétés",
    category: "Fiscalité",
    definition: "Impôt français sur les bénéfices des sociétés.",
    benchmark: "Taux normal: 25%. Taux réduit PME (38 120€ premiers): 15%.",
  },
  {
    term: "TVA",
    acronym: "Taxe sur la Valeur Ajoutée",
    category: "Fiscalité",
    definition:
      "Taxe collectée sur les ventes et déductible sur les achats. Reversée à l'État (mensuel ou trimestriel).",
    benchmark: "Taux normal: 20%. Sport hors abos: 5.5-10%.",
  },
  {
    term: "Carry-forward",
    category: "Fiscalité",
    definition: "Report de déficits fiscaux d'une année sur les bénéfices futurs (réduit l'IS).",
    benchmark: "France: report illimité jusqu'à 1M€ + 50% au-delà.",
  },
  {
    term: "Charges patronales",
    category: "Fiscalité",
    definition:
      "Cotisations sociales payées par l'employeur en sus du salaire brut.",
    benchmark: "Cadre: ~42%. Non-cadre: ~40%. Apprenti: ~10%.",
  },
  {
    term: "Acompte IS",
    category: "Fiscalité",
    definition:
      "Paiement trimestriel par anticipation de l'IS dû (mars/juin/sept/déc), basé sur l'année N-1.",
  },

  // Financement
  {
    term: "Equity",
    category: "Financement",
    definition: "Apports en capital (fonds propres) sans obligation de remboursement.",
  },
  {
    term: "Emprunt amortissable",
    category: "Financement",
    definition: "Emprunt remboursé par échéances constantes (capital + intérêts).",
    formula: "Mensualité = (P × r) / (1 − (1 + r)^−n)",
  },
  {
    term: "Obligation in fine (bullet)",
    category: "Financement",
    definition:
      "Obligation où le capital est remboursé en totalité à l'échéance. Seuls les intérêts sont payés régulièrement.",
  },
  {
    term: "PIK",
    acronym: "Payment In Kind",
    category: "Financement",
    definition:
      "Intérêts capitalisés (ajoutés au principal) au lieu d'être payés cash. Augmente la dette finale.",
  },
  {
    term: "Différé d'amortissement",
    category: "Financement",
    definition: "Période initiale où aucun capital n'est remboursé (seulement intérêts).",
  },
  {
    term: "PGE",
    acronym: "Prêt Garanti par l'État",
    category: "Financement",
    definition:
      "Dispositif français de prêt bancaire garanti à 70-90% par l'État (Bpifrance).",
  },
  {
    term: "Term sheet",
    category: "Financement",
    definition: "Document précontractuel formalisant les conditions d'une levée (valuation, gouvernance, anti-dilution, etc.).",
  },

  // Capacité
  {
    term: "Saturation",
    category: "Capacité",
    definition:
      "Ratio entre la demande (membres × sessions) et l'offre (heures coaching × slots/h).",
    benchmark: "70-85% = sweet spot. >100% = pertes d'abos / refus prospects.",
  },
  {
    term: "Slots/h",
    category: "Capacité",
    definition:
      "Nombre de places disponibles par heure de coaching = parallelClasses × capacityPerClass.",
    example: "2 cours × 14 places = 28 slots/h.",
  },
];

export const CATEGORIES: GlossaryCategory[] = [
  "P&L",
  "Cashflow",
  "Bilan",
  "Investisseur",
  "SaaS/Fitness",
  "Fiscalité",
  "Financement",
  "Capacité",
];
