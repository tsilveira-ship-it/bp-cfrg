import type { ModelParams } from "./model/types";
import type { StressDriver } from "./reverse-stress";

/**
 * Catalogue des drivers reverse-stress pour le BP CFRG.
 *
 * Chaque driver respecte l'invariant de monotonicité de `findBreakValue` :
 * en allant de `currentValue` vers `worstBound`, la santé du modèle décroît
 * monotoniquement. Drivers non-monotones (ex marketing budget — la courbe
 * EBITDA fait un U) ne sont pas inclus ici et sont traités par scan linéaire.
 *
 * Convention `worstBound` : valeur extrême au-delà de laquelle la dégradation
 * dépasse tout cas réaliste. Doit être atteignable par bisection sans casser
 * le compute (ex churn ≤ 50%, taux ≤ 50%).
 */

function clone(p: ModelParams): ModelParams {
  return structuredClone(p);
}

export const DEFAULT_STRESS_DRIVERS: StressDriver[] = [
  // === REVENUE — DEMAND ===
  {
    id: "churn",
    label: "Churn mensuel global",
    read: (p) => p.subs.monthlyChurnPct ?? 0,
    apply: (p, v) => {
      const out = clone(p);
      out.subs.monthlyChurnPct = v;
      // Active cohort model si présent pour propager le churn correctement
      return out;
    },
    direction: "higher-is-worse",
    worstBound: 0.20, // 20%/mo = catastrophique
    unit: "%/mo",
    isPct: true,
    rationale: "Plus le churn monte, plus le stock s'érode et le cash baisse.",
  },
  {
    id: "rampEnd",
    label: "Ramp fin M12 (rampEndCount)",
    read: (p) => p.subs.rampEndCount,
    apply: (p, v) => {
      const out = clone(p);
      out.subs.rampEndCount = Math.max(p.subs.rampStartCount, v);
      return out;
    },
    direction: "lower-is-worse",
    worstBound: 50, // 50 fin M12 = ramp catastrophique
    unit: "membres",
    rationale: "Ramp Y1 sous-réalisé = revenu Y1+ amoindri.",
  },
  {
    id: "rampStart",
    label: "Ramp M0 (rampStartCount)",
    read: (p) => p.subs.rampStartCount,
    apply: (p, v) => {
      const out = clone(p);
      out.subs.rampStartCount = Math.max(0, v);
      // rampEnd doit rester >= rampStart
      out.subs.rampEndCount = Math.max(out.subs.rampStartCount, p.subs.rampEndCount);
      return out;
    },
    direction: "lower-is-worse",
    worstBound: 0,
    unit: "membres",
    rationale: "Démarrage à vide = creux tréso accentué.",
  },
  {
    id: "growthRatesGlobal",
    label: "Croissance YoY (multiplicateur global)",
    read: () => 1, // multiplicateur centré
    apply: (p, v) => {
      const out = clone(p);
      out.subs.growthRates = (p.subs.growthRates ?? []).map((g) => g * v);
      return out;
    },
    direction: "lower-is-worse",
    worstBound: -0.5, // multiplicateur négatif = décroissance
    unit: "× growthRates",
    rationale: "Mult appliqué uniformément aux growthRates. 1.0 = courant.",
  },
  {
    id: "arpuMultiplier",
    label: "ARPU (multiplicateur global prix tiers)",
    read: () => 1,
    apply: (p, v) => {
      const out = clone(p);
      out.subs.tiers = p.subs.tiers.map((t) => ({ ...t, monthlyPrice: t.monthlyPrice * v }));
      return out;
    },
    direction: "lower-is-worse",
    worstBound: 0.3, // -70%
    unit: "× prix",
    rationale: "Pression prix proportionnelle sur tous les tiers.",
  },
  {
    id: "priceIndex",
    label: "Indexation prix annuelle",
    read: (p) => p.subs.priceIndexPa,
    apply: (p, v) => {
      const out = clone(p);
      out.subs.priceIndexPa = v;
      return out;
    },
    direction: "lower-is-worse",
    worstBound: -0.10, // déflation -10%/an
    unit: "%/an",
    isPct: true,
    rationale: "Si l'on doit baisser les prix (concurrence), à quel rythme ça casse.",
  },

  // === COSTS ===
  {
    id: "salaryMultiplier",
    label: "Masse salariale (multiplicateur)",
    read: () => 1,
    apply: (p, v) => {
      const out = clone(p);
      out.salaries = {
        ...p.salaries,
        items: p.salaries.items.map((it) => ({ ...it, monthlyGross: it.monthlyGross * v })),
        freelancePools: p.salaries.freelancePools.map((fp) => ({ ...fp, hourlyRate: fp.hourlyRate * v })),
      };
      return out;
    },
    direction: "higher-is-worse",
    worstBound: 2.5, // +150%
    unit: "× salaires",
    rationale: "Pression marché coachs / inflation salariale.",
  },
  {
    id: "salaryIndex",
    label: "Indexation salaires annuelle",
    read: (p) => p.salaries.annualIndexPa,
    apply: (p, v) => {
      const out = clone(p);
      out.salaries = { ...p.salaries, annualIndexPa: v };
      return out;
    },
    direction: "higher-is-worse",
    worstBound: 0.15, // +15%/an
    unit: "%/an",
    isPct: true,
    rationale: "SMIC + conventions sport. Worst-case inflation persistante.",
  },
  {
    id: "chargesPatro",
    label: "Charges patronales (fallback global)",
    read: (p) => p.salaries.chargesPatroPct,
    apply: (p, v) => {
      const out = clone(p);
      out.salaries = { ...p.salaries, chargesPatroPct: v };
      return out;
    },
    direction: "higher-is-worse",
    worstBound: 0.80,
    unit: "%",
    isPct: true,
    rationale: "Hausse cotisations URSSAF ou suppression allègements (Fillon, JEI).",
  },
  {
    id: "rentMultiplier",
    label: "Loyer (multiplicateur tous FY)",
    read: () => 1,
    apply: (p, v) => {
      const out = clone(p);
      out.rent = { ...p.rent, monthlyByFy: p.rent.monthlyByFy.map((r) => r * v) };
      return out;
    },
    direction: "higher-is-worse",
    worstBound: 2.0,
    unit: "× loyer",
    rationale: "Pression bailleur. Réviser bail commercial = +X%.",
  },

  // === CAPEX & FINANCING ===
  {
    id: "capexMultiplier",
    label: "CAPEX total (multiplicateur)",
    read: () => 1,
    apply: (p, v) => {
      const out = clone(p);
      out.capex = {
        equipment: p.capex.equipment * v,
        travaux: p.capex.travaux * v,
        juridique: p.capex.juridique * v,
        depots: p.capex.depots * v,
      };
      if (p.capexItems) {
        out.capexItems = p.capexItems.map((c) => ({ ...c, amount: c.amount * v }));
      }
      return out;
    },
    direction: "higher-is-worse",
    worstBound: 3.0,
    unit: "× CAPEX",
    rationale: "Dérapage travaux fréquent. Quel multiplicateur tue le cash ?",
  },
  {
    id: "loanRate",
    label: "Taux emprunts bancaires (annuel)",
    read: (p) => p.financing.loans[0]?.annualRatePct ?? 0,
    apply: (p, v) => {
      const out = clone(p);
      out.financing.loans = p.financing.loans.map((l) => ({ ...l, annualRatePct: v }));
      return out;
    },
    direction: "higher-is-worse",
    worstBound: 20,
    unit: "% annuel",
    rationale: "Taux BCE × spread bancaire en stress.",
  },
  {
    id: "bondRate",
    label: "Taux obligations (annuel)",
    read: (p) => p.financing.bonds[0]?.annualRatePct ?? 0,
    apply: (p, v) => {
      const out = clone(p);
      out.financing.bonds = p.financing.bonds.map((b) => ({ ...b, annualRatePct: v }));
      return out;
    },
    direction: "higher-is-worse",
    worstBound: 20,
    unit: "% annuel",
    rationale: "Marché obligations PME en stress.",
  },
  {
    id: "isRate",
    label: "Taux IS",
    read: (p) => p.tax.isRate,
    apply: (p, v) => {
      const out = clone(p);
      out.tax = { ...p.tax, isRate: v };
      return out;
    },
    direction: "higher-is-worse",
    worstBound: 0.40,
    unit: "%",
    isPct: true,
    rationale: "Politique fiscale future. Worst-case 40%.",
  },

  // === TIMING ===
  {
    id: "openingDelayMonths",
    label: "Retard d'ouverture (mois)",
    read: () => 0,
    apply: (p, v) => {
      const out = clone(p);
      const months = Math.max(0, Math.round(v));
      const lostFraction = Math.max(0, Math.min(1, months / 12));
      // Effet : on rate `months` premiers mois (revenu nul, OPEX continuent).
      // Approximation symétrique au tornado openingDelay : on dégrade ramp.
      out.subs.rampStartCount = p.subs.rampStartCount * (1 - lostFraction);
      out.subs.rampEndCount = p.subs.rampEndCount * (1 - lostFraction * 0.5);
      return out;
    },
    direction: "higher-is-worse",
    worstBound: 12,
    unit: "mois",
    rationale: "Travaux retardés, validation administrative en retard.",
  },
];
