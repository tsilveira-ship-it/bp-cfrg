// Sim L1 — vérifie:
// 1) Mode legacy SANS double-count = trajectoire identique churn=0 (sanity)
// 2) Mode cohort = trajectoire bien modélisée
// 3) Mode legacy avec churn=2% donne maintenant les mêmes counts qu'avant (avec churn=0)
//    car le churn n'affecte plus le stock NET, seulement LTV.

const FY_LEN = 12;
const HORIZON = 7 * FY_LEN;

const a = 80;
const b = 200;
const growthRates = [0.40, 0.30, 0.20, 0.15, 0.10, 0.08];
const seasonality = [1.20, 1.05, 1.0, 0.85, 1.15, 1.05, 1.0, 0.95, 0.90, 0.80, 0.65, 0.60];

// === Mode legacy NET target (NEW behavior, churn NOT applied to stock) ===
function netTarget() {
  const out = new Array(HORIZON).fill(0);
  for (let m = 0; m < FY_LEN; m++) out[m] = a + ((b - a) * m) / (FY_LEN - 1);
  let prevEnd = b;
  for (let fy = 1; fy < 7; fy++) {
    const g = growthRates[fy - 1] ?? 0;
    const start = prevEnd, end = prevEnd * (1 + g);
    for (let i = 0; i < FY_LEN; i++) out[fy * FY_LEN + i] = start + ((end - start) * i) / (FY_LEN - 1);
    prevEnd = end;
  }
  for (let m = 0; m < HORIZON; m++) {
    const moy = m % FY_LEN;
    out[m] = out[m] * seasonality[moy];
  }
  return out;
}

// === Mode cohort (NEW) ===
function cohort(churn, acqStart, acqEnd, acqGrowth) {
  const acq = new Array(HORIZON).fill(0);
  for (let m = 0; m < FY_LEN; m++) acq[m] = acqStart + ((acqEnd - acqStart) * m) / (FY_LEN - 1);
  let prevEnd = acqEnd;
  for (let fy = 1; fy < 7; fy++) {
    const g = acqGrowth[fy - 1] ?? 0;
    const start = prevEnd, end = prevEnd * (1 + g);
    for (let i = 0; i < FY_LEN; i++) acq[fy * FY_LEN + i] = start + ((end - start) * i) / (FY_LEN - 1);
    prevEnd = end;
  }
  for (let m = 0; m < HORIZON; m++) {
    const moy = m % FY_LEN;
    acq[m] = acq[m] * seasonality[moy];
  }
  const out = new Array(HORIZON).fill(0);
  for (let m = 0; m < HORIZON; m++) {
    let total = 0;
    for (let k = 0; k <= m; k++) total += acq[k] * Math.pow(1 - churn, m - k);
    out[m] = total;
  }
  return { count: out, acq };
}

const fyEnd = (arr) => Array.from({ length: 7 }, (_, fy) => arr[fy * FY_LEN + (FY_LEN - 1)]);

const net = netTarget();
console.log("\n=== MODE NET (legacy fixé) — churn n'affecte PLUS le stock ===");
console.log("Fin FY26..FY32:", fyEnd(net).map((v) => v.toFixed(0)).join(" "));

console.log("\n=== MODE COHORT — varie churn ===");
console.log("(acquisitions auto-calc Little's law: NET × churn)");
console.log("Churn% | Acq start | Acq end | Fin FY26 | Fin FY32");
console.log("-".repeat(60));
for (const c of [0.000, 0.010, 0.020, 0.025, 0.030, 0.050]) {
  const acqS = c > 0 ? a * c : 5;
  const acqE = c > 0 ? b * c : 12;
  const r = cohort(c, acqS, acqE, [0.10, 0.10, 0.10, 0.10, 0.10, 0.10]);
  const fyE = fyEnd(r.count);
  console.log(
    `${(c * 100).toFixed(1).padStart(5)}% | ${acqS.toFixed(1).padStart(8)}  | ${acqE.toFixed(1).padStart(7)} | ${fyE[0].toFixed(0).padStart(7)}  | ${fyE[6].toFixed(0).padStart(7)}`
  );
}

console.log("\n=== INTERPRÉTATION ===");
console.log("Mode NET donne maintenant trajectoire stable indépendante du churn.");
console.log("Mode cohort: pour atteindre 200 NET fin FY26 avec churn 2%, faut ~4 acq/mois.");
console.log("Test sanity: cohort(0, ...) sans churn = somme cumul des acquisitions.");
