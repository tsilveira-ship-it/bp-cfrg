// Dictionnaire d'analyses contextuelles pour les lignes financières.
// Chaque clé correspond à un libellé visible dans les tables / KPIs.

export const ANALYSES: Record<string, string> = {
  // P&L
  "CA": "Chiffre d'affaires HT (hors TVA). Inclut nouveaux abos + legacy + prestations + merchandising.",
  "Chiffre d'affaires": "Total des ventes HT sur la période. Référence pour calculer les marges.",
  "Total CA": "CA total HT. Doit être en croissance régulière pour soutenir le BP.",
  "Croissance": "Variation du CA vs année précédente. >20% = forte croissance, <10% = maturité.",
  "EBITDA": "Excédent Brut d'Exploitation. CA - charges d'exploitation. Indicateur de rentabilité opérationnelle. Doit devenir positif rapidement.",
  "Marge EBITDA": "EBITDA / CA. Cible secteur fitness premium: 20-30% en régime de croisière.",
  "% CA": "Poids du poste relatif au CA. Sert à comparer la structure de coûts dans le temps.",
  "Résultat net": "PBT - IS. Ce qui revient aux actionnaires. Différent du cashflow.",

  // Recettes
  "Nouveaux abonnements": "Abos illimités + séances. Driver principal de croissance. Surveiller le mix tier.",
  "Nouveaux abos": "Cohorte de nouveaux membres acquis chaque année. Driver principal du CA.",
  "Legacy Javelot": "Anciens membres migrés. En décroissance linéaire (-24/an par défaut). Substitué progressivement par nouveaux abos.",
  "Legacy": "Membres pré-existants en churn. Représente le plancher CA initial.",
  "Prestations complémentaires": "Crossfit teen + sénior + hors abo (FAC, kiné, locations). Marges ~30%, complément récurrent.",
  "Prestations": "Services additionnels hors abos standards.",
  "Merchandising": "Marge sur goodies + protéines + barres. Faible volume mais ratio marge élevé.",

  // Charges
  "Salaires": "Coût total employeur (brut + charges patronales) + freelance. Plus gros poste de charges.",
  "Loyer": "Loyer + taxes (foncière, CET) + charges copro. Charge fixe, peu flexible court terme.",
  "Loyer & charges salle": "Total location + taxes + copro. Représente ~20-30% du CA selon le moment du ramp.",
  "Récurrent": "Électricité, eau, ménage, assurance, comptable, etc. Souvent renégociable.",
  "Récurrent (entretien + frais op)": "Charges récurrentes mensuelles. Cible de réduction prioritaire (ménage, assurance).",
  "Marketing": "Publicité + provisions juridique. CAC variable. Doit scaler avec la croissance.",
  "Provisions": "Petit équipement + travaux. Maintien long terme du local.",
  "Ponctuels": "SACEM, défibrillateur, extincteurs, documentation. Annuels mais prévisibles.",
  "Ponctuels (SACEM, etc.)": "Charges ponctuelles annuelles. Faible montant total.",
  "Total OPEX": "Somme de toutes les charges opérationnelles. Doit être inférieur au CA pour générer EBITDA positif.",

  // Cash flow
  "CFO": "Cash Flow Opérationnel. EBITDA - IS - var BFR. Reflet de la trésorerie générée par l'activité.",
  "Cash Flow Opérationnel (CFO)": "Trésorerie générée par l'opérationnel. Doit devenir positif en année 2.",
  "CFI": "Cash Flow d'Investissement. CAPEX, travaux, dépôts. Négatif en M0 (276k€), 0 ensuite.",
  "Cash Flow Investissement (CFI)": "Décaissements en équipement et installations. Concentré sur l'année 1.",
  "CFF": "Cash Flow de Financement. Levées + emprunts - coupons - remboursements.",
  "Cash Flow Financement (CFF)": "Levées + emprunts - service dette. Négatif après ramp si dette importante.",
  "Variation de trésorerie": "CFO + CFI + CFF. Si négatif sur plusieurs années → problème de cash.",
  "Trésorerie fin d'exercice": "Solde cumulé de trésorerie. Si négatif → besoin de financement supplémentaire.",
  "Trésorerie fin": "Cash en banque fin de période. Doit toujours être positif.",
  "Trésorerie min": "Point bas de trésorerie sur tout l'horizon. Si négatif → ligne de découvert ou levée additionnelle requise.",
  "BFR": "Besoin en Fonds de Roulement = stock + créances clients - dettes fournisseurs. Pour gym: faible (Square paie vite).",
  "CAPEX": "Investissements en immobilisations. Équipement, travaux, juridique, dépôts garantie.",

  // P&L lignes spécifiques
  "Impôts": "IS = 25% du PBT positif. 0 si PBT négatif (déficit reportable).",
  "EBIT": "EBITDA - D&A. Résultat d'exploitation comptable.",
  "PBT": "EBIT - Charges financières. Profit avant impôts.",
  "D&A": "Dotations aux Amortissements. Étalement comptable du CAPEX. Charge non-cash.",
  "Intérêts": "Intérêts cash sur emprunts + obligations (hors capitalisé PIK).",

  // Salaires
  "Cadres": "Salariés cadres. Charges patronales ~42%. Statut majoritaire pour BP fitness.",
  "Cadres salariés": "Postes en CDI cadre. Coût total = brut × FTE × 1.42 + 13e mois + primes + avantages.",
  "Freelance": "Coachs facturant à l'heure. Pas de charges patronales mais TVA si > seuil.",
  "Coachs freelance": "Pools horaires (CFRG, Hyrox, Sandbox, Accueil). Flexible mais coûteux à long terme vs salariés.",
  "Total annuel 1": "Coût total employeur année 1 (brut + charges + avantages).",

  // Financement
  "Apports": "Equity non remboursable. Capital social + apports compte courant associé.",
  "Emprunts": "Dettes bancaires amortissables. Mensualités constantes (capital + intérêts).",
  "Obligations": "Dette obligataire. Paiement coupon + remboursement in fine ou linéaire. Différé possible avec capitalisation.",
  "Total levé": "Equity + emprunts + obligations. Doit couvrir CAPEX + tréso ramp-up.",
  "Inflow": "Encaissement des financements (M0 ou en tranches).",
  "Capitalisé": "Intérêts capitalisés (PIK) pendant le différé. Augmentent l'encours de dette.",
  "Coupon": "Paiement périodique d'intérêts sur obligation.",

  // Prestations détail
  "Abo Illimité (2 séances/j)": "Tier le plus cher. Pour les pratiquants intensifs. Mix 10% par défaut.",
  "Abo Illimité (1 séance/j)": "Tier mainstream pour pratiquants réguliers. Mix 40% par défaut.",
  "Abo 12 séances": "Pratiquants assidus mais pas illimités. Mix 20%.",
  "Abo 8 séances": "Tier intermédiaire. Mix 20%.",
  "Abo 4 séances": "Pratiquants occasionnels. Mix 10%, signal early-stage.",
};

export function getAnalysis(label: string): string | undefined {
  // Match exact d'abord
  if (ANALYSES[label]) return ANALYSES[label];
  // Match par contains
  for (const key in ANALYSES) {
    if (label.toLowerCase().includes(key.toLowerCase())) return ANALYSES[key];
  }
  return undefined;
}
