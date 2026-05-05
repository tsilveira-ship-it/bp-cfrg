import {
  effectiveMonthlyHours,
  expandCapex,
  monthlyEmployerCost,
  type BondIssue,
  type LoanLine,
  type ModelParams,
} from "./types";

const FY_LEN = 12;

export type YearlyBreakdownRow = {
  id: string;
  label: string;
  values: number[]; // length = horizonYears
};

function years(p: ModelParams): number {
  return p.timeline?.horizonYears ?? 7;
}

/** Détail des salaires par poste (cadres + freelance pools), sommé par FY. */
export function salariesBreakdown(p: ModelParams): YearlyBreakdownRow[] {
  const H = years(p) * FY_LEN;
  const profiles = p.salaries.chargesProfiles;
  const out: YearlyBreakdownRow[] = [];

  for (const item of p.salaries.items) {
    const values = new Array<number>(years(p)).fill(0);
    for (let m = 0; m < H; m++) {
      if (m < item.startMonth) continue;
      if (item.endMonth !== undefined && m > item.endMonth) continue;
      const fy = Math.floor(m / FY_LEN);
      const idx = Math.pow(1 + p.salaries.annualIndexPa, Math.max(0, fy - 1));
      values[fy] += monthlyEmployerCost(item, profiles, p.salaries.chargesPatroPct, idx, fy);
    }
    out.push({ id: `salary-${item.id}`, label: item.role, values });
  }

  for (const pool of p.salaries.freelancePools ?? []) {
    const values = new Array<number>(years(p)).fill(0);
    for (let m = 0; m < H; m++) {
      if (pool.startMonth !== undefined && m < pool.startMonth) continue;
      const fy = Math.floor(m / FY_LEN);
      const idx = Math.pow(1 + p.salaries.annualIndexPa, Math.max(0, fy - 1));
      values[fy] += pool.hourlyRate * effectiveMonthlyHours(pool) * idx;
    }
    out.push({ id: `pool-${pool.id}`, label: `${pool.name} (freelance)`, values });
  }

  return out;
}

/** Détail loyer: base par FY + charges copropriété (×12) + taxes annuelles. */
export function rentBreakdown(p: ModelParams): YearlyBreakdownRow[] {
  const Y = years(p);
  const base: YearlyBreakdownRow = {
    id: "rent-base",
    label: "Loyer base",
    values: new Array<number>(Y).fill(0),
  };
  const coopro: YearlyBreakdownRow = {
    id: "rent-coopro",
    label: "Charges copropriété",
    values: new Array<number>(Y).fill(p.rent.monthlyCoopro * 12),
  };
  const taxes: YearlyBreakdownRow = {
    id: "rent-taxes",
    label: "Taxes annuelles",
    values: new Array<number>(Y).fill(p.rent.yearlyTaxes),
  };
  for (let fy = 0; fy < Y; fy++) {
    const v = p.rent.monthlyByFy[fy] ?? p.rent.monthlyByFy[p.rent.monthlyByFy.length - 1] ?? 0;
    base.values[fy] = v * 12;
  }
  return [base, coopro, taxes];
}

/** Détail récurrent: une ligne par item (entretien + frais_op). */
export function recurringBreakdown(p: ModelParams): YearlyBreakdownRow[] {
  const Y = years(p);
  return p.recurring
    .filter((r) => r.category === "entretien" || r.category === "frais_op")
    .map((r) => ({
      id: `rec-${r.id}`,
      label: r.name,
      values: new Array<number>(Y).fill(r.monthly * 12),
    }));
}

/** Détail D&A: une ligne par poste CAPEX amorti. Respecte la durée d'amort propre à chaque poste. */
export function daBreakdown(p: ModelParams): YearlyBreakdownRow[] {
  if (!p.tax.enableDA) return [];
  const Y = years(p);
  const items = expandCapex(p);
  const out: YearlyBreakdownRow[] = [];
  for (const it of items) {
    if (it.amortYears <= 0 || it.amount <= 0) continue;
    const annual = it.amount / it.amortYears;
    const values = new Array<number>(Y).fill(0).map((_, fy) => (fy < it.amortYears ? annual : 0));
    out.push({ id: `da-${it.id}`, label: `${it.name} (${it.amortYears}y)`, values });
  }
  return out;
}

/** Détail intérêts par emprunt + par obligation (cash + capitalisé). */
export function interestBreakdown(p: ModelParams): YearlyBreakdownRow[] {
  const Y = years(p);
  const H = Y * FY_LEN;
  const out: YearlyBreakdownRow[] = [];

  for (const loan of p.financing.loans ?? []) {
    out.push({ id: `loan-int-${loan.id}`, label: loan.name, values: loanInterestByFy(loan, Y, H) });
  }
  for (const bond of p.financing.bonds ?? []) {
    out.push({ id: `bond-int-${bond.id}`, label: bond.name, values: bondInterestByFy(bond, Y, H) });
  }
  return out;
}

function loanInterestByFy(loan: LoanLine, Y: number, H: number): number[] {
  const values = new Array<number>(Y).fill(0);
  const r = loan.annualRatePct / 100 / 12;
  const n = loan.termMonths;
  const mensualite =
    r > 0 ? (loan.principal * r) / (1 - Math.pow(1 + r, -n)) : loan.principal / n;
  let bal = loan.principal;
  for (let i = 0; i < n; i++) {
    const m = loan.startMonth + i + 1;
    if (m >= H) break;
    const interest = bal * r;
    const principal = mensualite - interest;
    bal -= principal;
    values[Math.floor(m / FY_LEN)] += Math.max(0, interest);
  }
  return values;
}

function bondInterestByFy(bond: BondIssue, Y: number, H: number): number[] {
  const values = new Array<number>(Y).fill(0);
  const totalPeriods = Math.round(bond.termYears * bond.frequency);
  const deferralPeriods = Math.min(
    Math.round(bond.deferralYears * bond.frequency),
    totalPeriods
  );
  const monthsPerPeriod = 12 / bond.frequency;
  const periodRate = bond.annualRatePct / 100 / bond.frequency;
  let balance = bond.principal;

  for (let i = 1; i <= deferralPeriods; i++) {
    const interest = balance * periodRate;
    const m = bond.startMonth + Math.round(i * monthsPerPeriod);
    if (m < H) {
      values[Math.floor(m / FY_LEN)] += interest;
      if (bond.capitalizeInterest) balance += interest;
    } else if (bond.capitalizeInterest) {
      balance += interest;
    }
  }

  const remainingPeriods = totalPeriods - deferralPeriods;
  const linearPrincipal =
    bond.amortization === "linear" && remainingPeriods > 0 ? balance / remainingPeriods : 0;
  for (let j = 1; j <= remainingPeriods; j++) {
    const interest = balance * periodRate;
    let principalRepaid = 0;
    if (bond.amortization === "bullet") {
      principalRepaid = j === remainingPeriods ? balance : 0;
    } else {
      principalRepaid = j === remainingPeriods ? balance : linearPrincipal;
    }
    balance -= principalRepaid;
    if (Math.abs(balance) < 0.005) balance = 0;
    const m = bond.startMonth + Math.round((deferralPeriods + j) * monthsPerPeriod);
    if (m < H) values[Math.floor(m / FY_LEN)] += interest;
  }
  return values;
}

/** Détail CAPEX initial: une ligne par poste, montant réparti uniquement en FY0. */
export function capexBreakdown(p: ModelParams): YearlyBreakdownRow[] {
  const Y = years(p);
  const items = expandCapex(p);
  return items.map((it) => {
    const arr = new Array<number>(Y).fill(0);
    arr[0] = it.amount;
    return { id: `capex-${it.id}`, label: it.name, values: arr };
  });
}

/** Remboursement principal par emprunt + par obligation. */
export function principalRepayBreakdown(p: ModelParams): YearlyBreakdownRow[] {
  const Y = years(p);
  const H = Y * FY_LEN;
  const out: YearlyBreakdownRow[] = [];

  for (const loan of p.financing.loans ?? []) {
    const values = new Array<number>(Y).fill(0);
    const r = loan.annualRatePct / 100 / 12;
    const n = loan.termMonths;
    const mensualite =
      r > 0 ? (loan.principal * r) / (1 - Math.pow(1 + r, -n)) : loan.principal / n;
    let bal = loan.principal;
    for (let i = 0; i < n; i++) {
      const m = loan.startMonth + i + 1;
      if (m >= H) break;
      const interest = bal * r;
      const principal = mensualite - interest;
      bal -= principal;
      values[Math.floor(m / FY_LEN)] += Math.max(0, principal);
    }
    out.push({ id: `loan-pr-${loan.id}`, label: loan.name, values });
  }

  for (const bond of p.financing.bonds ?? []) {
    const values = new Array<number>(Y).fill(0);
    const totalPeriods = Math.round(bond.termYears * bond.frequency);
    const deferralPeriods = Math.min(
      Math.round(bond.deferralYears * bond.frequency),
      totalPeriods
    );
    const monthsPerPeriod = 12 / bond.frequency;
    const periodRate = bond.annualRatePct / 100 / bond.frequency;
    let balance = bond.principal;
    for (let i = 1; i <= deferralPeriods; i++) {
      if (bond.capitalizeInterest) balance += balance * periodRate;
    }
    const remainingPeriods = totalPeriods - deferralPeriods;
    const linearPrincipal =
      bond.amortization === "linear" && remainingPeriods > 0 ? balance / remainingPeriods : 0;
    for (let j = 1; j <= remainingPeriods; j++) {
      let principalRepaid = 0;
      if (bond.amortization === "bullet") {
        principalRepaid = j === remainingPeriods ? balance : 0;
      } else {
        principalRepaid = j === remainingPeriods ? balance : linearPrincipal;
      }
      balance -= principalRepaid;
      if (Math.abs(balance) < 0.005) balance = 0;
      const m = bond.startMonth + Math.round((deferralPeriods + j) * monthsPerPeriod);
      if (m < H) values[Math.floor(m / FY_LEN)] += principalRepaid;
    }
    out.push({ id: `bond-pr-${bond.id}`, label: bond.name, values });
  }

  return out;
}

/** Apports de capitaux par tranche (equity) par FY. */
export function fundraiseBreakdown(p: ModelParams): YearlyBreakdownRow[] {
  const Y = years(p);
  const H = Y * FY_LEN;
  const out: YearlyBreakdownRow[] = [];
  for (const eq of p.financing.equity ?? []) {
    const values = new Array<number>(Y).fill(0);
    if (eq.startMonth < H) values[Math.floor(eq.startMonth / FY_LEN)] += eq.amount;
    out.push({ id: `eq-${eq.id}`, label: eq.name, values });
  }
  for (const loan of p.financing.loans ?? []) {
    const values = new Array<number>(Y).fill(0);
    if (loan.startMonth < H) values[Math.floor(loan.startMonth / FY_LEN)] += loan.principal;
    out.push({
      id: `loan-in-${loan.id}`,
      label: `${loan.name} (emprunt)`,
      values,
    });
  }
  for (const bond of p.financing.bonds ?? []) {
    const values = new Array<number>(Y).fill(0);
    if (bond.startMonth < H) values[Math.floor(bond.startMonth / FY_LEN)] += bond.principal;
    out.push({
      id: `bond-in-${bond.id}`,
      label: `${bond.name} (obligation)`,
      values,
    });
  }
  return out;
}
