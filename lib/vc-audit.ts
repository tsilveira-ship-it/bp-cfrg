import type { ModelParams, ModelResult } from "./model/types";
import { DEFAULT_CHARGES, getPatroPct } from "./model/types";
import { SECTOR_BENCHMARKS } from "./comparables";
import { CASH_THRESHOLDS, FINANCING_RATE_THRESHOLDS } from "./thresholds";

const fmtPct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
const fmtPct0 = (v: number) => fmtPct(v, 0);

export type VCSeverity = "kill" | "major" | "yellow" | "watch";
export type VCDimension =
  | "Marché & demande"
  | "Unit economics"
  | "Croissance & rétention"
  | "Coûts & opérations"
  | "Financement & dilution"
  | "Comptabilité & fiscal"
  | "Capacité & exécution"
  | "Équipe & gouvernance"
  | "Sortie & liquidité"
  | "Risques externes";

export type VCFinding = {
  id: string;
  dimension: VCDimension;
  severity: VCSeverity;
  claim: string;
  challenge: string;
  evidence: string;
  fix: string;
};

const SEV_LABEL: Record<VCSeverity, string> = {
  kill: "🔴 Kill — un VC sortirait sur ça",
  major: "🟠 Majeur — défendre ou retirer",
  yellow: "🟡 Discutable — preuve manquante",
  watch: "⚪ À surveiller",
};

export function severityLabel(s: VCSeverity): string {
  return SEV_LABEL[s];
}

export function runVCAudit(p: ModelParams, r: ModelResult): VCFinding[] {
  const out: VCFinding[] = [];

  const tiers = p.subs.tiers ?? [];
  const avgPrice = tiers.reduce((s, t) => s + t.monthlyPrice * t.mixPct, 0);
  const lastFy = r.yearly[r.yearly.length - 1];
  const firstFy = r.yearly[0];
  const totalEquity = (p.financing.equity ?? []).reduce((s, x) => s + x.amount, 0);
  const totalLoans = (p.financing.loans ?? []).reduce((s, x) => s + x.principal, 0);
  const totalBonds = (p.financing.bonds ?? []).reduce((s, x) => s + x.principal, 0);
  const totalDebt = totalLoans + totalBonds;
  const totalRaised = totalEquity + totalDebt;
  const totalCapex =
    p.capex.equipment + p.capex.travaux + p.capex.juridique + p.capex.depots;
  const cumulativeNetIncome = r.yearly.reduce((s, y) => s + y.netIncome, 0);
  const churn = p.subs.monthlyChurnPct ?? 0;
  const lastSubsCount = r.monthly[r.monthly.length - 1]?.subsCount ?? 0;
  const marketingY1 = p.marketing.monthlyBudget * 12;
  const newMembersY1Approx = Math.max(1, p.subs.rampEndCount - p.subs.rampStartCount);
  const cacApprox = marketingY1 / newMembersY1Approx;
  const ltvMonths = churn > 0 ? 1 / churn : 60;
  const ltv = avgPrice * ltvMonths;
  const ltvOverCac = cacApprox > 0 ? ltv / cacApprox : Infinity;

  // === MARCHÉ & DEMANDE ===
  out.push({
    id: "tam-sam-som",
    dimension: "Marché & demande",
    severity: "major",
    claim: `Le BP raisonne sur un ramp ${p.subs.rampStartCount}→${p.subs.rampEndCount} membres sans définir le marché adressable.`,
    challenge:
      "Quel est le TAM (fitness Paris ~1.5M pratiquants ?), le SAM (CrossFit/Hyrox 6e arr ~?), le SOM (zone primaire 800m) ? Combien de boxes dans un rayon de 2km ? Pourquoi un nouvel entrant gagne ?",
    evidence:
      "Aucune route /market dans l'app (cf docs/AUDIT-GLOBAL-2026-05.md §3.3). Les comparables existent en /comparables mais sans cartographie de la concurrence parisienne (Reebok Louvre, Train Yard, Belleville…).",
    fix: "Ajouter route /market avec 3 cercles TAM/SAM/SOM sourcés (Xerfi/INSEE/IHRSA), carte 10 concurrents Paris + prix + reviews Google, 5 personas chiffrés.",
  });

  out.push({
    id: "demand-validation",
    dimension: "Marché & demande",
    severity: "major",
    claim: `Hypothèse: ${p.subs.rampStartCount} membres dès M0, ${p.subs.rampEndCount} fin M12.`,
    challenge:
      "Pré-inscriptions signées ? Liste d'attente ? Lettre intention bailleur sur affluence ? Sans signal de demande contractualisé, c'est de la pensée magique.",
    evidence:
      `${p.subs.rampStartCount} départ = ouverture quasi-pleine d'un nouveau site. Les boxes Paris atteignent 250-450 mature (cf SECTOR_BENCHMARKS.membersMatureCrossfit) sur 18-36 mois, pas 12. ${p.legacy?.startCount ?? 0} legacy pré-existants aident mais ne suffisent pas.`,
    fix: "Publier liste de pré-inscriptions horodatées (signed-up + dépôt 50€), reviews Google de la marque CFRG, taux de conversion bilans → abos sur 6 mois pré-ouverture.",
  });

  // === UNIT ECONOMICS ===
  if (churn === 0) {
    out.push({
      id: "churn-zero",
      dimension: "Unit economics",
      severity: "kill",
      claim: "Churn mensuel = 0% — aucun membre ne part jamais.",
      challenge:
        "C'est mathématiquement faux. Un VC ferme le deck sur ce chiffre. Mêmes les boxes les plus communautaires perdent 1.5-3%/mo (déménagements, blessures, vie pro, perte de motivation).",
      evidence:
        `monthlyChurnPct=${churn} dans les params actifs. Benchmark CrossFit communautaire: ${(SECTOR_BENCHMARKS.churnCrossfitCommunity.low * 100).toFixed(1)}–${(SECTOR_BENCHMARKS.churnCrossfitCommunity.high * 100).toFixed(1)}%/mois.`,
      fix: `Activer un churn réaliste ${fmtPct(SECTOR_BENCHMARKS.churnCrossfitCommunity.low, 1)}–${fmtPct(SECTOR_BENCHMARKS.churnCrossfitCommunity.high, 1)}/mois (ou cohort model 6 niveaux déjà dispo) et recalculer LTV/CAC + capacité fin d'horizon.`,
    });
  } else if (churn < 0.015) {
    out.push({
      id: "churn-low",
      dimension: "Unit economics",
      severity: "major",
      claim: `Churn ${(churn * 100).toFixed(1)}%/mois — sous le low-end industrie.`,
      challenge:
        "Pourquoi toi mieux qu'une box communautaire mature qui tourne à 1.5–3% ? Quelle preuve sur l'historique exploité ?",
      evidence: `Benchmark: ${(SECTOR_BENCHMARKS.churnCrossfitCommunity.low * 100).toFixed(1)}–${(SECTOR_BENCHMARKS.churnCrossfitCommunity.high * 100).toFixed(1)}%/mois.`,
      fix: `Joindre cohorte rétention réelle (Javelot/ResaWod 24+ mois) ou monter à ${fmtPct(SECTOR_BENCHMARKS.churnCrossfitCommunity.low, 1)}/mois.`,
    });
  }

  out.push({
    id: "cac-missing",
    dimension: "Unit economics",
    severity: "major",
    claim: `Marketing flat ${marketingY1.toLocaleString("fr-FR")}€/an pour acquérir ~${newMembersY1Approx} membres en Y1.`,
    challenge:
      `CAC implicite ≈ ${cacApprox.toFixed(0)}€. Mais quel mix payant/organique/bouche-à-oreille ? Quel coût par canal ? Le budget reste flat sur 7 ans alors que le ramp +30%/an exigerait un marketing/CA croissant.`,
    evidence:
      `marketing.monthlyBudget=${p.marketing.monthlyBudget}€, pctOfRevenue=${(p.marketing.pctOfRevenue * 100).toFixed(1)}%. Industrie fitness: CAC ${SECTOR_BENCHMARKS.cacFitness.low}–${SECTOR_BENCHMARKS.cacFitness.high}€ (IHRSA).`,
    fix: "Ventiler par canal (Meta Ads, Google, partenariats, parrainage, evt) avec CAC par canal et budget % CA croissant 1.5–3%.",
  });

  if (ltvOverCac < 3 && isFinite(ltvOverCac)) {
    out.push({
      id: "ltv-cac-ratio",
      dimension: "Unit economics",
      severity: "major",
      claim: `LTV/CAC ≈ ${ltvOverCac.toFixed(1)}x — sous le seuil VC standard 3x.`,
      challenge:
        "Tout VC SaaS/abonnement filtre sur LTV/CAC ≥ 3x. En dessous, l'unité de croissance détruit de la valeur.",
      evidence: `LTV ≈ ${ltv.toFixed(0)}€ (avg price ${avgPrice.toFixed(0)}€ × ${ltvMonths.toFixed(0)} mois) / CAC ≈ ${cacApprox.toFixed(0)}€.`,
      fix: "Soit baisser CAC (organique, parrainage), soit augmenter LTV (rétention, upsell coaching perso).",
    });
  } else if (!isFinite(ltvOverCac)) {
    out.push({
      id: "ltv-cac-ratio-infinite",
      dimension: "Unit economics",
      severity: "yellow",
      claim: "LTV/CAC infini car churn = 0 — non audit-able.",
      challenge: "Un investisseur veut voir LTV/CAC chiffré ; un infini est un signal d'alerte.",
      evidence: "Voir finding 'churn-zero'.",
      fix: "Activer churn réaliste pour publier un LTV/CAC défendable.",
    });
  }

  if (avgPrice < SECTOR_BENCHMARKS.monthlyPriceCrossfit.low) {
    out.push({
      id: "pricing-low",
      dimension: "Unit economics",
      severity: "yellow",
      claim: `Prix moyen pondéré ${avgPrice.toFixed(0)}€/mois TTC.`,
      challenge:
        `En dessous du low-end CrossFit Paris (${SECTOR_BENCHMARKS.monthlyPriceCrossfit.low}–${SECTOR_BENCHMARKS.monthlyPriceCrossfit.high}€). Quel positionnement ? Premium discount ?`,
      evidence: SECTOR_BENCHMARKS.monthlyPriceCrossfit.source,
      fix: "Justifier ou remonter le mix vers les tiers haut.",
    });
  }

  // === CROISSANCE ===
  const growth = p.subs.growthRates ?? [];
  const yoy1 = growth[0] ?? 0;
  if (yoy1 > 0.3 && churn < 0.02) {
    out.push({
      id: "growth-magic",
      dimension: "Croissance & rétention",
      severity: "major",
      claim: `Croissance Y2 = ${(yoy1 * 100).toFixed(0)}% sans churn matériel.`,
      challenge:
        "Croissance brute = croissance nette quand churn=0. C'est de la pensée magique : il faut acquérir +X membres ET remplacer ceux qui partent. Aucune box parisienne ne fait du +30% net après ramp.",
      evidence: `growthRates=[${growth.map((g) => (g * 100).toFixed(0) + "%").join(", ")}]. CrossFit affiliate census: maturation typique 18-36 mois puis plateau.`,
      fix: "Décomposer growth = (acquisition - churn) × baseline. Modéliser canal par canal.",
    });
  }

  if (p.subs.priceIndexPa === 0) {
    out.push({
      id: "price-index-zero",
      dimension: "Croissance & rétention",
      severity: "yellow",
      claim: "Tarifs gelés sur 7 ans (priceIndexPa = 0%).",
      challenge:
        "Inflation France 2-3%/an. Geler le prix nominal = baisse du prix réel ~15-20% sur l'horizon. Pourquoi ?",
      evidence: `priceIndexPa=${p.subs.priceIndexPa}.`,
      fix: "Indexer 2%/an minimum (suit l'inflation) ou justifier la stratégie low-price.",
    });
  }

  // === COÛTS & OPÉRATIONS ===
  if (p.salaries.annualIndexPa === 0) {
    out.push({
      id: "salary-index-zero",
      dimension: "Coûts & opérations",
      severity: "major",
      claim: "Salaires figés 7 ans (annualIndexPa = 0%).",
      challenge:
        "SMIC + conventions sportives indexées chaque année. C'est interdit légalement de ne pas réviser. Sous-estime la masse salariale d'environ 15-20% à l'horizon.",
      evidence: `salaries.annualIndexPa=${p.salaries.annualIndexPa}.`,
      fix: "Indexer 2%/an minimum (suit SMIC).",
    });
  }

  // Détection « charges URSSAF effectivement nulles » : on calcule le patro effectif
  // appliqué par le moteur (compute.ts) sur chaque poste. Si la somme est 0, le finding
  // se déclenche — quelle que soit la valeur de chargesPatroPct ou la présence/absence
  // de chargesProfiles. Évite à la fois faux négatifs (chargesPatroPct=0 mais profiles
  // peuplés) et faux positifs (chargesPatroPct=0 mais items catégorisés).
  const monthlyGrossAll = p.salaries.items.reduce(
    (s, it) => s + (it.fy26Bump ?? it.monthlyGross) * it.fte,
    0
  );
  const annualEmployerPatro = p.salaries.items.reduce((s, it) => {
    const patro = getPatroPct(it, p.salaries.chargesProfiles, p.salaries.chargesPatroPct);
    return s + (it.fy26Bump ?? it.monthlyGross) * it.fte * patro * 12;
  }, 0);
  if (annualEmployerPatro <= 0 && monthlyGrossAll > 0) {
    const profileByCat = (cat: string) =>
      (p.salaries.chargesProfiles ?? DEFAULT_CHARGES).find((pr) => pr.category === cat);
    const cadrePatro = profileByCat("cadre")?.patroPct ?? 0.42;
    const nonCadrePatro = profileByCat("non-cadre")?.patroPct ?? 0.40;
    const tnsPatro = profileByCat("tns")?.patroPct ?? 0.22;
    const apprentiPatro = profileByCat("apprenti")?.patroPct ?? 0.10;
    const annualMissingPatro = monthlyGrossAll * cadrePatro * 12;
    out.push({
      id: "charges-patro-zero",
      dimension: "Coûts & opérations",
      severity: "kill",
      claim: "Charges patronales effectives = 0% — modèle URSSAF désactivé.",
      challenge:
        `Standard cadre FR ≈ ${fmtPct0(cadrePatro)}, non-cadre ≈ ${fmtPct0(nonCadrePatro)}. Sur ~${Math.round(monthlyGrossAll).toLocaleString("fr-FR")}€/mois bruts × ${fmtPct0(cadrePatro)} = +${Math.round(annualMissingPatro / 1000)}k€/an de charges manquantes. Le P&L est biaisé d'autant.`,
      evidence: `chargesPatroPct=${p.salaries.chargesPatroPct}, aucun poste salarié ne porte de category exploitable.`,
      fix: `Affecter une category à chaque poste (cadre ${fmtPct0(cadrePatro)}, non-cadre ${fmtPct0(nonCadrePatro)}, tns ${fmtPct0(tnsPatro)} pour associés-gérants majoritaires, apprenti ${fmtPct0(apprentiPatro)}) ou fixer chargesPatroPct global.`,
    });
  }

  // Marketing flat
  if (p.marketing.pctOfRevenue === 0) {
    out.push({
      id: "marketing-flat",
      dimension: "Coûts & opérations",
      severity: "yellow",
      claim: "Marketing 100% fixe, 0% du CA.",
      challenge:
        "Acquisition coûte plus cher quand le ramp s'accélère. Un budget flat = sous-investissement en croissance ou sur-investissement en début.",
      evidence: `marketing.pctOfRevenue=${p.marketing.pctOfRevenue}.`,
      fix: `Mix part fixe + part % CA (cible ${fmtPct(SECTOR_BENCHMARKS.marketingPctOfRevenueFitness.low, 1)}–${fmtPct(SECTOR_BENCHMARKS.marketingPctOfRevenueFitness.high, 1)} du CA, IHRSA fitness club) pour scaler avec le ramp.`,
    });
  }

  // Loyer Y1→Y2 jump
  const rent = p.rent.monthlyByFy ?? [];
  if (rent.length >= 2 && rent[0] > 0 && rent[1] / rent[0] > 1.3) {
    const jump = ((rent[1] / rent[0] - 1) * 100).toFixed(0);
    out.push({
      id: "rent-jump",
      dimension: "Coûts & opérations",
      severity: "yellow",
      claim: `Loyer Y1→Y2 +${jump}% (${rent[0]}€ → ${rent[1]}€).`,
      challenge:
        "Saut atypique. Lettre d'intention signée ? Bail commercial 3-6-9 avec clause progressive ? Sinon le bailleur peut renégocier.",
      evidence: `monthlyByFy=[${rent.join(", ")}].`,
      fix: "Joindre LOI ou projet de bail. Si non sécurisé, modéliser scénario +10% supplémentaire.",
    });
  }

  // === COMPTA & FISCAL ===
  if (p.tax.enableIs === false && cumulativeNetIncome > 50000) {
    out.push({
      id: "is-disabled",
      dimension: "Comptabilité & fiscal",
      severity: "kill",
      claim: `IS désactivé alors que résultat net cumulé = ${(cumulativeNetIncome / 1000).toFixed(0)}k€.`,
      challenge:
        `Un résultat positif sans IS, c'est un P&L hors-loi fiscale. Surévaluation systématique du net de ~${fmtPct0(p.tax.isRate)}. Aucun banquier ou VC ne valide.`,
      evidence: `tax.enableIs=${p.tax.enableIs}, cumulativeNetIncome=${cumulativeNetIncome.toFixed(0)}€.`,
      fix: `Activer IS ${fmtPct0(p.tax.isRate)} (FR PME standard ${fmtPct0(SECTOR_BENCHMARKS.isRateFR.high)} ; taux réduit ${fmtPct0(SECTOR_BENCHMARKS.isRateFR.low)} jusque 42 500€). Carry-forward déficits déjà supporté.`,
    });
  }

  if (p.tax.enableDA === false && totalCapex > 50000) {
    const yEquip = p.tax.amortYearsEquipment ?? p.tax.daYears ?? 5;
    const yTrav = p.tax.amortYearsTravaux ?? Math.max(p.tax.daYears ?? 10, 10);
    const annualDaEstimate =
      p.capex.equipment / Math.max(1, yEquip) +
      p.capex.travaux / Math.max(1, yTrav);
    out.push({
      id: "da-disabled",
      dimension: "Comptabilité & fiscal",
      severity: "major",
      claim: `Amortissements désactivés alors que CAPEX = ${(totalCapex / 1000).toFixed(0)}k€.`,
      challenge:
        `Le CAPEX doit être amorti — sinon c'est de la création de cash gratuite dans le bilan. ~${Math.round(annualDaEstimate / 1000)}k€/an d'amortissement manquant qui réduit l'IS et la marge nette.`,
      evidence: `tax.enableDA=${p.tax.enableDA}.`,
      fix: `Activer D&A linéaire ${yEquip} ans équipement, ${yTrav} ans travaux.`,
    });
  }

  if (p.bfr.daysOfRevenue === 0 && !p.bfr.daysReceivables && !p.bfr.daysSupplierPayables) {
    out.push({
      id: "bfr-zero",
      dimension: "Comptabilité & fiscal",
      severity: "yellow",
      claim: "BFR = 0 jour de CA.",
      challenge:
        "Square commission 2-3 jours encaissement, dettes fournisseurs 30j, stock merch — le BFR n'est jamais rigoureusement zéro.",
      evidence: `bfr=${JSON.stringify(p.bfr)}.`,
      fix: "Modéliser ~+3j créances Square, -30j dettes fournisseurs, +5j stock = BFR négatif (favorable).",
    });
  }

  // === FINANCEMENT ===
  if (totalRaised > 0) {
    const dRatio = totalDebt / totalRaised;
    if (dRatio > FINANCING_RATE_THRESHOLDS.debtToTotalWarn) {
      out.push({
        id: "debt-equity-ratio",
        dimension: "Financement & dilution",
        severity: "major",
        claim: `Dette / total levée = ${(dRatio * 100).toFixed(0)}% (${(totalDebt / 1000).toFixed(0)}k€ dette / ${(totalRaised / 1000).toFixed(0)}k€).`,
        challenge:
          "Pour une création de boîte pré-CA, un D/E >50% est agressif. Les banques exigent 30-40% fonds propres minimum, BPI demande 1€ apport pour 1€ prêt.",
        evidence: `equity=${totalEquity}, loans=${totalLoans}, bonds=${totalBonds}.`,
        fix: "Soit augmenter equity, soit décaler les bonds après break-even (réduit le risque perçu).",
      });
    }
  }

  for (const bond of p.financing.bonds ?? []) {
    if (bond.capitalizeInterest && (bond.deferralYears ?? 0) >= 2) {
      const effRate =
        Math.pow(1 + bond.annualRatePct / 100, bond.deferralYears ?? 0) - 1;
      out.push({
        id: `bond-cap-${bond.id}`,
        dimension: "Financement & dilution",
        severity: "yellow",
        claim: `Obligation "${bond.name}": ${bond.annualRatePct}% capitalisé sur ${bond.deferralYears} ans = +${(effRate * 100).toFixed(1)}% au remboursement.`,
        challenge:
          "Capitaliser l'intérêt soulage le cash mais explose le notional final. Quel investisseur souscrit à 6% in fine bullet sur projet pré-CA ?",
        evidence: `principal=${bond.principal}, term=${bond.termYears}y, defer=${bond.deferralYears}y, capitalize=${bond.capitalizeInterest}.`,
        fix: "Stress-tester : si DSCR Y3-Y4 chute, le bond bascule en défaut. Considérer convertible plutôt qu'in-fine.",
      });
    }
  }

  // Cap-table dilution
  const sh = p.capTable?.shareholders ?? [];
  const totalShares = sh.reduce((s: number, x) => s + x.shares, 0);
  if (totalShares > 0) {
    const founders = sh.filter((x) => x.type === "founder");
    const founderPct = founders.reduce((s: number, x) => s + x.shares, 0) / totalShares;
    if (founderPct < 0.6) {
      out.push({
        id: "cap-table-founder-low",
        dimension: "Financement & dilution",
        severity: "yellow",
        claim: `Fondateurs détiennent ${(founderPct * 100).toFixed(0)}% au seed.`,
        challenge:
          "VC série A demandera typiquement 15-25% supplémentaires. Si fondateurs <60% post-seed, dilution future = perte de contrôle avant break-even.",
        evidence: `total shares=${totalShares}, founders=${founders.length}.`,
        fix: "Cibler 70-80% fondateurs post-seed pour absorber 1-2 tours futurs.",
      });
    }
  }

  // Tréso buffer
  if (r.cashTroughValue < 0) {
    out.push({
      id: "cash-negative",
      dimension: "Financement & dilution",
      severity: "kill",
      claim: `Trésorerie creux = ${(r.cashTroughValue / 1000).toFixed(0)}k€ (négative).`,
      challenge:
        "Le BP n'est pas finançable en l'état. Un VC voit ça en 30 secondes sur le cashflow.",
      evidence: `cashTroughMonth=${r.cashTroughMonth}.`,
      fix: "Renforcer apports, accélérer revenue, réduire CAPEX, ou décaler embauches.",
    });
  } else if (r.cashTroughValue < CASH_THRESHOLDS.comfortEur) {
    out.push({
      id: "cash-thin",
      dimension: "Financement & dilution",
      severity: "major",
      claim: `Buffer tréso minimum = ${(r.cashTroughValue / 1000).toFixed(0)}k€.`,
      challenge:
        "Un buffer < 3 mois d'OPEX expose à n'importe quel choc (panne, retard travaux, churn imprévu). Un VC veut voir 3-6 mois de runway permanent.",
      evidence: `cashTroughValue=${r.cashTroughValue}.`,
      fix: `Lever +50-100k€ supplémentaire ou ouvrir ligne découvert (cible ≥ ${(CASH_THRESHOLDS.comfortEur / 1000).toFixed(0)}k€).`,
    });
  }

  // === CAPACITÉ ===
  const lastSubsTotal =
    (r.monthly[r.monthly.length - 1]?.subsCount ?? 0) +
    (r.monthly[r.monthly.length - 1]?.legacyCount ?? 0);
  if (lastSubsTotal < SECTOR_BENCHMARKS.membersMatureCrossfit.low) {
    out.push({
      id: "members-low",
      dimension: "Capacité & exécution",
      severity: "yellow",
      claim: `Cible fin d'horizon: ${Math.round(lastSubsTotal)} membres totaux.`,
      challenge:
        `Une box mature parisienne tourne à ${SECTOR_BENCHMARKS.membersMatureCrossfit.low}-${SECTOR_BENCHMARKS.membersMatureCrossfit.high}. Soit le BP est conservateur (rassure mais limite l'upside), soit la capacité physique cap à ${Math.round(lastSubsTotal)} et il faut le justifier.`,
      evidence: `subsCount + legacyCount fin d'horizon = ${Math.round(lastSubsTotal)}.`,
      fix: "Soit publier un scénario haut atteignant 350+ avec capacité supplémentaire, soit documenter pourquoi le plafond est physique.",
    });
  }

  // === ÉQUIPE & GOUVERNANCE ===
  const associes = p.salaries.items.filter((it) => /associ/i.test(it.role));
  if (associes.length >= 2 && associes.every((a) => a.monthlyGross === associes[0].monthlyGross)) {
    out.push({
      id: "founders-same-salary",
      dimension: "Équipe & gouvernance",
      severity: "watch",
      claim: `${associes.length} associés-gérants à même salaire ${associes[0].monthlyGross}€/mois.`,
      challenge:
        "Différenciation des rôles ? Un VC veut voir clairement CEO vs COO/CTO avec responsabilités et incentives différenciés. Salaire identique = ambiguïté gouvernance.",
      evidence: `items=[${associes.map((a) => a.role + ":" + a.monthlyGross).join(", ")}].`,
      fix: "Spécifier titres distincts (CEO/COO), shares différenciées si pertinent, vesting 4 ans cliff 1 an.",
    });
  }

  // === SORTIE ===
  out.push({
    id: "exit-strategy",
    dimension: "Sortie & liquidité",
    severity: "major",
    claim: "Aucune stratégie de sortie modélisée.",
    challenge:
      "Multiple EBITDA fitness 4-6x → valo Y7 ~? Mais qui achète une single-box CrossFit Paris ? Basic Fit n'acquiert pas, les groupes Hyrox émergent. Sans buyer-set crédible, la liquidité est théorique.",
    evidence: `multipleEbitdaFitness=${SECTOR_BENCHMARKS.multipleEbitdaFitness.low}-${SECTOR_BENCHMARKS.multipleEbitdaFitness.high}x. Pas de page /exit-strategy dans l'app.`,
    fix: "Ajouter /exit-strategy avec 3 options chiffrées (LBO interne, cession Hyrox/groupe, franchise multi-sites) + valorisation projetée par scénario.",
  });

  // === RISQUES EXTERNES ===
  out.push({
    id: "regulatory",
    dimension: "Risques externes",
    severity: "watch",
    claim: "Aucune mention licence/agrément/affiliation à risque.",
    challenge:
      "Affiliation CrossFit HQ révocable. Affiliation Hyrox même chose. Que se passe-t-il si l'une saute ? La marque CrossFit Rive Gauche est-elle déposée INPI ?",
    evidence: "recurring contains affiliation CrossFit + Hyrox 395€/mo.",
    fix: "Documenter contrats affiliations (durée, clauses sortie, alternatives) + dépôt marque INPI.",
  });

  out.push({
    id: "single-site",
    dimension: "Risques externes",
    severity: "yellow",
    claim: "Concentration mono-site Paris Rive Gauche.",
    challenge:
      "Toute interruption (incendie, dégât eaux, fermeture sanitaire à la Covid, travaux voirie) tue 100% du CA. Aucun plan B géographique.",
    evidence: "1 site, 1 bail.",
    fix: "Modéliser scénario stress 30j fermeture (RC pro + perte exploitation). Documenter assurance couverture.",
  });

  return out;
}

export const VC_PROMPT = `Tu es un VC sceptique et un banquier d'affaires. Audite ce business plan CFRG (CrossFit Rive Gauche) avec la rigueur d'un Series A institutionnel.

## Mission
1. Lis tous les paramètres actifs du scénario (lib/model/defaults.ts ou scenario actif Supabase) et le résultat de computeModel (lib/model/compute.ts).
2. Pour chaque dimension ci-dessous, identifie tout ce qui est faible, biaisé, optimiste, non-prouvé, ou non-modélisé.
3. Pour chaque finding: claim factuel + challenge (devil's advocate, role VC) + evidence (chiffre/code/source) + fix (action concrète et chiffrée).

## Dimensions à challenger
- **Marché & demande**: TAM/SAM/SOM, pré-inscriptions signées, cartographie concurrence, NPS, témoignages.
- **Unit economics**: CAC par canal, LTV, ratio LTV/CAC ≥3x, payback période, gross margin par tier.
- **Croissance & rétention**: courbe rétention cohort, churn par tier, indexation prix, growth gross vs net.
- **Coûts & opérations**: charges patronales calibrées (cadre/non-cadre/TNS/apprenti), indexation salaires SMIC, marketing % CA scalable, loyer LOI signée.
- **Financement & dilution**: ratio D/E, DSCR Y1-Y3, dilution post-seed, vesting fondateurs, cap-table waterfall.
- **Comptabilité & fiscal**: IS activé, D&A activé, BFR détaillé Square/fournisseurs/stock, TVA mensuelle, déficits reportés, JEI/CIR.
- **Capacité & exécution**: heatmap saturation, slots disponibles vs demande, no-show rate, peak hour bottleneck, ramp coachs vs membres.
- **Équipe & gouvernance**: differentiation CEO/COO, board, advisors, vesting, full-time vs part-time, track record chiffré.
- **Sortie & liquidité**: multiples EBITDA fitness, buyer-set crédible (Hyrox group, franchise), valorisation projetée par scénario.
- **Risques externes**: affiliations CrossFit HQ/Hyrox révocables, dépôt marque INPI, concentration mono-site, risque sanitaire/Covid, dépendance bail.

## Méthode
- Sois agressif, mais factuel. Aucun finding sans evidence chiffrée.
- Sévérité: 🔴 Kill (deal breaker) / 🟠 Majeur (à défendre) / 🟡 Discutable / ⚪ À surveiller.
- Si tu ne trouves rien sur une dimension, dis-le explicitement et explique pourquoi.
- À la fin, donne une note /10 par dimension + note globale + verdict (« investable / pas investable / à corriger »).
- Si tu juges avoir épuisé tout ce qui est challengeable, dis-le clairement et donne le verdict final.

## Itération
À chaque relance, ne répète PAS les findings déjà mentionnés (lis l'historique fourni). Trouve de nouveaux angles : edge cases, second-order effects, scénarios de stress, comparaisons sectorielles précises (Reebok CrossFit Louvre, Train Yard, Belleville prix/membres/heatmap), ratios financiers VC standards (Rule of 40, Magic Number, Burn Multiple, CAC payback).

Lance l'audit maintenant.`;
