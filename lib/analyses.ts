// Dictionnaire d'analyses contextuelles. Volontairement écrites en langage simple
// pour des associés / investisseurs non-financiers.

export const ANALYSES: Record<string, string> = {
  // ─── P&L (compte de résultat) ───
  "CA": "Chiffre d'Affaires HT — total des ventes hors TVA. C'est l'argent qui rentre via les abonnements et prestations.",
  "Chiffre d'affaires": "Total des ventes hors TVA. Le 'top line' du business.",
  "Total CA": "CA total HT cumulé sur l'année. Doit grandir d'année en année.",
  "Croissance": "% d'augmentation du CA d'une année sur l'autre. >20% = forte croissance, <10% = mature/saturé.",
  "EBITDA": "Bénéfice avant intérêts, impôts et amortissements. C'est ce que le business gagne 'cash' sur ses opérations. Indicateur n°1 de rentabilité.",
  "Marge EBITDA": "EBITDA ÷ CA, en %. Cible secteur fitness premium: 20-30%. <10% = marges faibles, à surveiller.",
  "% CA": "Poids d'un poste rapporté au CA. Permet de comparer les structures de coûts (ex: si salaires = 50% du CA, c'est élevé).",
  "Résultat net": "Bénéfice après impôts. C'est l'argent qui peut être distribué aux actionnaires ou réinvesti.",
  "EBIT": "Bénéfice d'exploitation = EBITDA - amortissements. Indique la rentabilité comptable opérationnelle (vs cash).",
  "PBT": "Profit Before Tax / Bénéfice avant impôt. = EBIT - charges financières (intérêts d'emprunts).",
  "D&A": "Dotations aux Amortissements. Étalement comptable du coût des investissements (équipement, travaux). Ne sort pas de cash mais réduit le résultat fiscal. Cruciale pour réduire l'IS.",
  "Intérêts": "Charges financières des emprunts et obligations. Argent payé aux banques et investisseurs obligataires.",
  "Impôts": "Impôt sur les Sociétés (IS) — taux configurable dans /parameters → Fiscalité (FR PME standard 25 %, taux réduit 15 % jusque 42 500 €). Si résultat négatif → 0, déficit reportable.",

  // ─── Recettes ───
  "Nouveaux abonnements": "Membres acquis chaque mois. Driver principal de croissance du CA.",
  "Nouveaux abos": "Cohorte de nouveaux membres. Plus la barre monte vite, plus le CA décolle.",
  "Legacy Javelot": "Anciens membres récupérés du club Javelot. Stock de départ qui décroit naturellement.",
  "Legacy": "Anciens membres récupérés du club Javelot, en décroissance progressive année après année (paramètre legacy.yearlyChurnAbs).",
  "Prestations complémentaires": "Crossfit Teen, sénior, hors-abonnement (séances ponctuelles, kiné). Revenus complémentaires.",
  "Prestations": "Services à côté des abos standards. Marges typiquement élevées.",
  "Merchandising": "Vente de goodies, protéines, barres. Petit volume mais marge ~30%.",

  // ─── Charges ───
  "Salaires": "Coût total employeur (brut + charges patronales) + freelances. Plus gros poste de charges, à optimiser dès le début.",
  "Loyer": "Loyer + taxes (foncière, CET) + charges copro. Charge fixe, peu flexible.",
  "Loyer & charges salle": "Total location + taxes + copro. Souvent 20-30% du CA en early stage.",
  "Récurrent": "Électricité, eau, ménage, assurances, comptable. Charges mensuelles incompressibles, mais renégociables (ménage notamment).",
  "Récurrent (entretien + frais op)": "Charges récurrentes mensuelles. Cible de réduction prioritaire.",
  "Marketing": "Publicité + provisions juridiques. Doit augmenter avec la croissance pour soutenir l'acquisition.",
  "Provisions": "Argent mis de côté pour petit équipement et travaux d'entretien.",
  "Ponctuels": "Charges annuelles (SACEM, défibrillateur, extincteurs). Faible montant total.",
  "Total OPEX": "Somme de toutes les charges d'exploitation. Si > CA → perte. Si < CA → profit.",

  // ─── Cash flow ───
  "CFO": "Cash Flow Opérationnel — argent généré par l'activité. EBITDA - impôts - variation BFR. Doit devenir positif rapidement.",
  "Cash Flow Opérationnel (CFO)": "Trésorerie générée par l'activité. Si négatif → on consomme du cash chaque mois.",
  "CFI": "Cash Flow d'Investissement — argent dépensé en équipement et installations (CAPEX). Concentré au démarrage.",
  "Cash Flow Investissement (CFI)": "Décaissements pour acheter le matériel. Concentré au démarrage (M0 négatif), proche de 0 ensuite.",
  "CFF": "Cash Flow de Financement — argent reçu (levées + emprunts) moins remboursements et coupons.",
  "Cash Flow Financement (CFF)": "Levées + emprunts - remboursements. Positif au démarrage, négatif quand on rembourse.",
  "Variation de trésorerie": "Évolution du cash en banque sur l'année. CFO + CFI + CFF. Si négatif plusieurs années → besoin de financement.",
  "Trésorerie fin d'exercice": "Solde du compte en banque à la fin de l'année. Doit toujours être positif.",
  "Trésorerie fin": "Cash en banque fin de période. Si négatif → on est en cessation de paiement.",
  "Trésorerie min": "Le pire moment de l'année (point bas). Si négatif → ligne de découvert ou levée additionnelle nécessaire.",
  "BFR": "Besoin en Fonds de Roulement = délai entre les ventes et les paiements. Pour une salle de fitness avec Square: faible (paiement immédiat).",
  "CAPEX": "Investissements en immobilisations. Équipement + travaux + juridique + dépôts garantie.",

  // ─── Métriques investisseur ───
  "IRR": "Taux de Rentabilité Interne (TRI). % de rendement annuel qu'un investisseur obtient. Cible PME: >15% pour equity, 5-8% pour obligataire. <0% = perte.",
  "IRR equity": "Rendement annuel des actionnaires. Calculé sur cashflows: -investissement initial + valorisation finale. Cible: >15-20% pour startup early-stage.",
  "Multiple": "Combien l'investisseur récupère par € investi. 2x = il double sa mise. 3x+ = excellent. 1x = il récupère juste sa mise sans gain.",
  "Multiple equity": "Sortie ÷ investissement. Multiple 2.5x sur 7 ans ≈ IRR 14%/an.",
  "NPV": "Net Present Value / Valeur Actuelle Nette. Somme des cashflows futurs ramenés à aujourd'hui via un taux d'actualisation. Positif = projet rentable au-delà du coût du capital.",
  "Payback": "Période de retour sur investissement. Temps nécessaire pour récupérer l'argent investi via les cashflows. <5 ans = bon, >7 ans = long.",
  "DSCR": "Debt Service Coverage Ratio. CFO ÷ service dette. Mesure si le business génère assez pour rembourser sa dette. Banque exige typiquement >1.2x. <1x = défaut probable.",
  "LTV": "Lifetime Value / Valeur à vie d'un membre. Prix mensuel × durée moyenne d'abonnement. Plus c'est haut, plus le membre 'vaut' cher.",
  "CAC": "Customer Acquisition Cost / Coût d'acquisition. Marketing ÷ nouveaux membres. Plus c'est bas, plus l'acquisition est efficace.",
  "Ratio LTV/CAC": "Si >3x → modèle sain, marketing rentable. Si <1x → on perd de l'argent à chaque acquisition.",
  "Total levé": "Capital total réuni: apports + emprunts + obligations. Doit couvrir CAPEX + buffer trésorerie.",

  // ─── Salaires ───
  "Cadres": "Salariés en CDI cadre. Charges patronales ~42%. Statut majoritaire pour BP fitness.",
  "Cadres salariés": "Postes en CDI cadre. Coût total = brut × FTE × 1.42 + 13e mois + primes + avantages.",
  "Freelance": "Coachs facturant à l'heure (auto-entrepreneurs). Pas de charges patronales, plus flexibles, mais plus chers/h.",
  "Coachs freelance": "Pools horaires (CFRG, Hyrox, Sandbox, Accueil). Flexibles mais coût par heure plus élevé que salarié à long terme.",
  "FTE": "Full Time Equivalent / Équivalent Temps Plein. 1 FTE = 1 personne à 100%. 0.5 FTE = mi-temps ou demi-personne.",
  "Effectif cadre (FTE)": "Total équivalent temps plein des postes salariés cadres.",
  "Coût mensuel cadre": "Total brut + charges patronales + avantages pour les cadres. Premier mois.",
  "Coût mensuel freelance": "Total facturation freelance par mois. Variable selon heures effectuées.",
  "Coût employeur": "Total que paie l'entreprise pour un salarié = brut + charges patronales (~42% pour cadre). C'est le 'vrai' coût d'un poste, pas le brut.",
  "Brut": "Salaire brut affiché sur la fiche de paie. Net + charges salariales (~22%). Le brut n'est pas ce que coûte le poste à l'entreprise.",
  "Net": "Salaire perçu par le salarié (avant impôt sur le revenu).",

  // ─── Financement ───
  "Apports": "Capital injecté par les associés. Pas de remboursement (sauf liquidation).",
  "Apports / Equity": "Equity = fonds propres = part dans la société. Pas remboursable mais donne droit aux dividendes et plus-value.",
  "Emprunts": "Dette bancaire amortissable. Mensualités constantes capital + intérêts. Coût: taux annuel.",
  "Emprunts bancaires": "Prêts bancaires classiques (BPI, banques commerciales). Mensualité constante, durée 5-10 ans.",
  "Obligations": "Titres de dette émis par la société, achetés par investisseurs. Possibilité différé + capitalisation = pas de cash sorti pendant X années.",
  "Inflow": "Encaissement = argent qui rentre (financements reçus).",
  "Capitalisé": "Intérêts non payés cash mais ajoutés au capital de la dette. Mécanisme PIK = Pay In Kind.",
  "Capitalisé (PIK)": "Pay In Kind. Pendant le différé, les intérêts ne sont pas payés mais ajoutés au capital. Soulage la trésorerie au démarrage.",
  "Coupon": "Paiement périodique d'intérêts sur une obligation. Comme les loyers d'une dette.",
  "PIK": "Pay In Kind. Intérêts capitalisés (ajoutés au capital de la dette) pendant le différé. Pas de cash sorti, mais dette grossit.",
  "In fine": "Type de remboursement: paiement intégral du capital à la fin (bullet). Avantage: ne paie que les intérêts pendant la durée.",

  // ─── Sensibilité ───
  "Saturation": "% d'utilisation de la capacité. 100% = pleine capacité atteinte. >100% = on refuse des abos (perte d'opportunité).",
  "Saturation max": "Pic de saturation sur l'horizon. Si >85% = recruter. Si >100% = embaucher avant.",
  "Capacité théorique max": "Nombre max de membres simultanés que la salle peut accueillir vu les heures coaching et la capacité par cours.",
  "Stress test": "Simulation 'que se passe-t-il si...?'. Pessimist = -20% CA, +10% coûts. Permet de voir si le BP tient.",

  // ─── Bilan ───
  "Immo brutes": "Valeur d'achat des immobilisations (équipement + travaux). Avant amortissement.",
  "Immo nettes": "Immobilisations nettes des amortissements cumulés. Valeur comptable actuelle.",
  "Capitaux propres": "Apports des associés + résultats cumulés. Si capitaux propres < 50% du capital social → alerte (perte significative).",
  "Dettes": "Total des emprunts et obligations restant à rembourser.",
  "Total Actif": "Tout ce que possède la société (immo + tréso + créances).",
  "Total Passif": "D'où vient l'argent (capitaux propres + dettes). Doit égaler l'actif.",

  // ─── Saisonnalité / capacité ───
  "Saisonnalité": "Modulation mensuelle. Sept = pic rentrée, été = creux. Permet réalisme du modèle.",
  "Churn": "Taux de perte de clients. 2-3% mensuel = standard fitness. Plus c'est bas, mieux c'est.",
  "Rétention": "Inverse du churn. Combien de mois en moyenne un membre reste.",

  // ─── Tiers abos ───
  "Abo Illimité (2 séances/j)": "Tier le plus cher. Pour les pratiquants intensifs.",
  "Abo Illimité (1 séance/j)": "Tier mainstream pour pratiquants réguliers.",
  "Abo 12 séances": "Pratiquants assidus mais pas illimités.",
  "Abo 8 séances": "Tier intermédiaire.",
  "Abo 4 séances": "Pratiquants occasionnels.",

  // ─── Audit ───
  "Économies cumulées": "Total annuel d'économies si toutes les optimisations proposées sont appliquées.",
  "Break-even": "Mois où l'EBITDA cumulé devient positif. Le business 'rembourse' ses pertes initiales.",

  // ─── Niveau 6 — Modélisation avancée ───
  "Mode cohort": "Au lieu d'imposer un stock cible (ramp 80→200), on saisit les acquisitions brutes/mois et chaque cohorte décroît selon la rétention. Modélisation plus fidèle car découplée: si churn double, on voit immédiatement l'impact, sans avoir à 'corriger' à la main le stock cible.",
  "Acquisitions brutes": "Membres acquis chaque mois AVANT churn. Différent du NET (acquis − partis). Pour acquérir 50 NET/mois avec churn 2%, il faut acquérir ~80-90 brut.",
  "Cohorte": "Groupe de membres entrés le même mois. Chaque cohorte décroît selon sa propre courbe de rétention. Permet d'isoler l'impact d'un canal marketing sur sa cohorte spécifique.",
  "Rétention équivalente": "Espérance de durée d'abonnement. Calculée comme 1/churn en mode exponentiel (loi géométrique) ou Σ courbe[t] en mode courbe empirique. Sert au LTV.",
  "Courbe rétention": "Override la formule exp(1−churn)^t. Saisir % survivants à M0/M1/M3/M6/M12/M24. Utile pour modéliser un 'newbie drop' typique CrossFit (gros départ M1-M3, stabilisation après).",
  "Newbie drop": "Phénomène commun dans le fitness : 30-40% de nouveaux abonnés partent dans les 3 premiers mois. La courbe exponentielle classique sous-estime cette chute initiale.",
  "Mix évolutif": "Le mix entre tiers d'abonnement (ex 30% illimité, 40% 12 séances) peut évoluer par FY. Permet de modéliser une montée en gamme progressive (40% → 55% premium sur 5 ans).",
  "Canaux d'acquisition": "Décomposition de l'acquisition par source (brochure, ResaWod, SEO, parrainage, ads). Chaque canal a son CAC et son mix. Permet un CAC pondéré réaliste plutôt qu'une moyenne implicite marketing/acquisitions.",
  "Saisonnalité acquisition": "Modulation différenciée du nombre de bilans/acquisitions par mois calendaire. Sept ×1.20 = +20% d'acquisitions en septembre vs moyenne annuelle. Distinct de la saisonnalité globale du CA.",
  "Saisonnalité churn": "Modulation du churn par mois calendaire. Juillet ×1.5 = churn 50% plus élevé en été (vacances, désabos avant été). Indépendant de la courbe de rétention; si courbe active, modulation churn est ignorée.",
  "Pause/freeze": "% moyen de membres en pause d'abonnement à un instant donné. Ils ne paient pas mais ne sont pas churnés. Typique CrossFit 2-5% (vacances, blessures, déplacements pro).",
  "Bilan funnel": "Modélisation explicite du funnel séance découverte 19,90€ → abonnement. acquisitions[m] = bilans[m] × conversion%. Permet d'attaquer le sujet par le côté commercial (X bilans/mois nécessaires).",
  "Saturation capacité": "Demande de places (membres × sessions/mois) divisée par la capacité offerte (espaces × cours/sem × cap/cours × 4.3). >1 = on refuse des membres. À comparer à la heatmap pour trouver le créneau saturé.",
  "Cohort sum": "count[m] = Σ_{k=0..m} acquisitions[k] × retention(m−k). Formule mathématique standard pour modéliser un stock à partir d'acquisitions et de rétention. O(H²) en calcul.",
  "Little's law": "Steady-state: stock = acquisition × durée moyenne. Pour maintenir 200 membres à 2% churn/mois → besoin 4 acquisitions/mois. Utilisé par le bouton 'Auto-calc' du mode cohort.",
};

export function getAnalysis(label: string): string | undefined {
  if (ANALYSES[label]) return ANALYSES[label];
  // Match partiel par contains pour souplesse
  const lower = label.toLowerCase();
  for (const key in ANALYSES) {
    if (lower.includes(key.toLowerCase())) return ANALYSES[key];
  }
  return undefined;
}
