// Simulation churn — reproduit logique compute.ts:124-154
// Démontre que churnFactor compose à mauvais endroit.

const FY_LEN = 12;
const HORIZON = 7 * FY_LEN; // 84 mois

const a = 80;   // rampStartCount
const b = 200;  // rampEndCount
const growthRates = [0.40, 0.30, 0.20, 0.15, 0.10, 0.08];
const seasonality = [1.20, 1.05, 1.0, 0.85, 1.15, 1.05, 1.0, 0.95, 0.90, 0.80, 0.65, 0.60];
const tierAvgPriceTTC = 144 * 0.20 + 168 * 0.15 + 162 * 0.20 + 136 * 0.15 + 100 * 0.20 + 70.83 * 0.10;

function simulate(churn, label) {
  const out = new Array(HORIZON).fill(0);

  for (let m = 0; m < FY_LEN; m++) {
    out[m] = a + ((b - a) * m) / (FY_LEN - 1);
  }
  let prevEnd = b;
  for (let fy = 1; fy < 7; fy++) {
    const g = growthRates[fy - 1] ?? 0;
    const start = prevEnd;
    const end = prevEnd * (1 + g);
    for (let i = 0; i < FY_LEN; i++) {
      out[fy * FY_LEN + i] = start + ((end - start) * i) / (FY_LEN - 1);
    }
    prevEnd = end;
  }

  for (let m = 0; m < HORIZON; m++) {
    const moy = m % FY_LEN;
    const seasonFactor = seasonality[moy];
    const churnFactor = Math.pow(1 - churn, m);
    out[m] = out[m] * seasonFactor * churnFactor;
  }

  const fyEnd = [];
  for (let fy = 0; fy < 7; fy++) {
    fyEnd.push(out[fy * FY_LEN + (FY_LEN - 1)]);
  }
  const totalRevenueHT = out.reduce((s, c) => s + c * (tierAvgPriceTTC / 1.20), 0);
  return { label, churn, fyEnd, totalRevenueHT };
}

const scenarios = [
  simulate(0.000, "0% (default actuel)"),
  simulate(0.010, "1% mensuel"),
  simulate(0.020, "2% mensuel (standard CrossFit)"),
  simulate(0.030, "3% mensuel (haut CrossFit)"),
  simulate(0.050, "5% mensuel (fitness chain)"),
];

console.log("\n=== SIMULATION CHURN — count fin d'année (member) ===\n");
console.log("Scenario                              | FY26 | FY27 | FY28 | FY29 | FY30 | FY31 | FY32");
console.log("-".repeat(105));
for (const s of scenarios) {
  const cells = s.fyEnd.map((v) => v.toFixed(0).padStart(4)).join(" | ");
  console.log(`${s.label.padEnd(38)}| ${cells}`);
}

console.log("\n=== CA cumulé HT 7 ans (€) ===\n");
const baseRev = scenarios[0].totalRevenueHT;
for (const s of scenarios) {
  const delta = ((s.totalRevenueHT - baseRev) / baseRev) * 100;
  console.log(
    `${s.label.padEnd(38)} ${(s.totalRevenueHT / 1000).toFixed(0).padStart(8)} k€  (Δ ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%)`
  );
}

console.log("\n=== ANALYSE BUG ===\n");
console.log("rampEndCount=200 cible NET fin FY26 (12 mo) — mais churnFactor(0.02, 11) = 0.80");
console.log("→ FY26 fin month avec churn 2% = 200 × 0.60 (saison) × 0.80 (churn) = 95.5");
console.log("→ Churn appliqué APRÈS la trajectoire d'acquisition = double comptage si user");
console.log("  considère que rampEndCount inclut déjà l'effet churn (acquis - perdus).");
console.log("\n=== SÉMANTIQUE ATTENDUE ===\n");
console.log("Option A (recommandée) : rampEndCount = NET target → SUPPRIMER churnFactor");
console.log("  Churn sert uniquement à calculer LTV = ARPU × (1/churn) sur page /investor.");
console.log("Option B : Modèle cohort — chaque mois ajoute N nouveaux, chaque cohorte décroît.");
console.log("  count[m] = sum_{k=0..m} acquired[k] × (1-churn)^(m-k)");
console.log("  Plus juste mais demande paramètre acquisition mensuelle distinct.");
