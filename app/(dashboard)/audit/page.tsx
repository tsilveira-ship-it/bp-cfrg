"use client";
import { useMemo } from "react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { DEFAULT_PARAMS } from "@/lib/model/defaults";
import type { ModelParams } from "@/lib/model/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtCurrency, fmtPct } from "@/lib/format";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  TrendingDown,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

type Severity = "high" | "medium" | "low";

type Finding = {
  severity: Severity;
  title: string;
  body: string;
  fix: string;
};

const FINDINGS: Finding[] = [
  {
    severity: "high",
    title: "Trésorerie négative année 1 (ramp-up)",
    body: "EBITDA structurellement négatif sur la première année (CA en montée linéaire 80→200 nouveaux abos), tandis que les charges fixes (loyer, masse salariale cadres + freelance) tournent à plein. Risque cash crunch.",
    fix: "Ligne de découvert ou différé emprunt + 13e mois reporté en année 2.",
  },
  {
    severity: "high",
    title: "Masse salariale lourde dès le démarrage",
    body: "16 500€/mo cadres + 13 086€/mo freelance = 29 586€/mo dès le mois 1 alors que le CA n'arrive qu'à plein régime au mois 12. Représente 50%+ du burn rate ramp-up.",
    fix: "Démarrer Headcoach 2 + Associés en M6, statut TNS pour associés-gérants, mix freelance progressif.",
  },
  {
    severity: "high",
    title: "Heures freelance dimensionnées pour pleine capacité",
    body: "Floor CFRG 8h/d × 5 + 4h/d × 2 = 48h/sem dès M0. Mais avec 80 abos départ vs 200 cible, l'utilisation initiale est ~40%. Sur-staffé en début.",
    fix: "Démarrer à 50% des heures freelance puis ramp linéaire sur 6 mois.",
  },
  {
    severity: "medium",
    title: "Marketing flat 32 400€/an pendant 7 ans",
    body: "CAC implicite ne suit pas la croissance. Pour soutenir +30%/an de membres, ratio marketing/CA devrait progresser.",
    fix: "Activer marketing % CA (1-2%) en complément du fixe.",
  },
  {
    severity: "medium",
    title: "Pas d'IS modélisé sur années rentables",
    body: "Résultats positifs FY28+ (~270k+) sans charge fiscale. Sous-estime ~25% du résultat net.",
    fix: "Activer IS dans /parameters → Fiscalité.",
  },
  {
    severity: "medium",
    title: "Pas d'amortissements (D&A)",
    body: "CAPEX initial 276k€ non amorti. ~25-35k€/an d'amortissement manquant.",
    fix: "Activer D&A — 5 ans linéaire.",
  },
  {
    severity: "medium",
    title: "Salaires flat sur 7 ans (annualIndexPa = 0%)",
    body: "Aucune indexation inflation/SMIC. Irréaliste sur horizon long.",
    fix: "Indexation 2%/an.",
  },
  {
    severity: "low",
    title: "Tarifs fixes 7 ans",
    body: "Aucune hausse de prix vs inflation.",
    fix: "Indexation tarifs 2%/an.",
  },
  {
    severity: "low",
    title: "BFR = 0",
    body: "Square commission + abos prélevés mensuellement, légère trésorerie BFR à modéliser.",
    fix: "Ajouter ~15j de CA en BFR.",
  },
  {
    severity: "low",
    title: "Loyer FY26 +81% puis stabilisé",
    body: "Discontinuité bail à valider auprès du bailleur.",
    fix: "Confirmer clause progressive ou négocier.",
  },
];

type Saving = {
  id: string;
  category: "Masse salariale" | "Charges" | "Investissement" | "Loyer" | "Financement";
  title: string;
  rationale: string;
  estimatedYearOneSavings: number;
  apply: (p: ModelParams) => ModelParams;
};

const SAVINGS: Saving[] = [
  {
    id: "tns_associes",
    category: "Masse salariale",
    title: "Statut TNS pour associés-gérants",
    rationale:
      "Charges sociales TNS ≈ 22% (vs 42% cadre) sur les 2 associés gérants à 3300€/mo. Économie ~15 800€/an + simplification administrative.",
    estimatedYearOneSavings: 15800,
    apply: (p) => ({
      ...p,
      salaries: {
        ...p.salaries,
        items: p.salaries.items.map((it) =>
          it.id === "associes" ? { ...it, category: "non-cadre", annualRaisePct: 0.02 } : it
        ),
      },
    }),
  },
  {
    id: "headcoach_delay",
    category: "Masse salariale",
    title: "Démarrer 2e Headcoach en M6",
    rationale:
      "À 80 nouveaux abos en M0, un seul Headcoach suffit. Décaler le 2e à M6 (atteinte ~140 abos): économie ~3300€×6 + charges = ~28 000€ FY1.",
    estimatedYearOneSavings: 28000,
    apply: (p) => ({
      ...p,
      salaries: {
        ...p.salaries,
        items: p.salaries.items.map((it) =>
          it.role === "Headcoach" ? { ...it, fte: 1, startMonth: 6 } : it
        ),
      },
    }),
  },
  {
    id: "freelance_ramp",
    category: "Masse salariale",
    title: "Ramp progressif heures freelance Floor",
    rationale:
      "Démarrer à 50% des heures Floor CFRG/Hyrox (4h/jour ouvré au lieu de 8) et passer à 100% au M6. Économie ~3 100€×6 = ~18 600€ FY1.",
    estimatedYearOneSavings: 18600,
    apply: (p) => ({
      ...p,
      salaries: {
        ...p.salaries,
        freelancePools: (p.salaries.freelancePools ?? []).map((pool) => {
          if (pool.id === "floor_cfrg") {
            return { ...pool, hoursPerWeekday: 5, hoursPerWeekendDay: 2.5 };
          }
          if (pool.id === "floor_hyrox") {
            return { ...pool, hoursPerWeekday: 3, hoursPerWeekendDay: 1 };
          }
          return pool;
        }),
      },
    }),
  },
  {
    id: "salesmgr_alternance",
    category: "Masse salariale",
    title: "Sales manager en alternance/apprenti",
    rationale:
      "Recruter en apprenti/alternance (charges patronales ~10% vs 42%) sur 24 mois. Économie ~10 600€/an.",
    estimatedYearOneSavings: 10600,
    apply: (p) => ({
      ...p,
      salaries: {
        ...p.salaries,
        items: p.salaries.items.map((it) =>
          it.id === "salesmgr"
            ? { ...it, category: "apprenti", monthlyGross: 1800, fy26Bump: 2000 }
            : it
        ),
      },
    }),
  },
  {
    id: "menage_negotiate",
    category: "Charges",
    title: "Renégocier société de ménage",
    rationale:
      "5 000€/mo soit 60k€/an — parmi les plus élevés. Mise en concurrence ou ménage interne (1 FTE non-cadre 1500€) baisse à ~3000€/mo. Économie ~24 000€/an.",
    estimatedYearOneSavings: 24000,
    apply: (p) => ({
      ...p,
      recurring: p.recurring.map((r) => (r.id === "menage" ? { ...r, monthly: 3000 } : r)),
    }),
  },
  {
    id: "loyer_franchise",
    category: "Loyer",
    title: "Négocier 3 mois de franchise loyer",
    rationale:
      "Standard pour ouverture nouvelle salle. 3 mois gratuits sur 10 000€/mo = économie 30 000€ FY1.",
    estimatedYearOneSavings: 30000,
    apply: (p) => {
      // Approximation: réduit le loyer FY1 de 25% (3 mois sur 12)
      const newRent = [...p.rent.monthlyByFy];
      newRent[0] = Math.round(p.rent.monthlyByFy[0] * 0.75);
      return { ...p, rent: { ...p.rent, monthlyByFy: newRent } };
    },
  },
  {
    id: "capex_phase",
    category: "Investissement",
    title: "Étaler les travaux (50% M0 + 50% M12)",
    rationale:
      "Phase 1 ouverture + Phase 2 améliorations (Hyrox extra, sandbox) une fois cash flow validé. Soulage tréso M0 de 50 000€.",
    estimatedYearOneSavings: 50000,
    apply: (p) => ({
      ...p,
      capex: { ...p.capex, travaux: Math.round(p.capex.travaux / 2) },
    }),
  },
  {
    id: "marketing_perf",
    category: "Charges",
    title: "Réduire marketing fixe + ajouter % CA performance",
    rationale:
      "Passer de 2700€/mo fixe à 1500€ + 2% du CA (acquisition payée à la conversion). Économie nette ~10 000€ FY1, sustainable au-delà.",
    estimatedYearOneSavings: 10000,
    apply: (p) => ({
      ...p,
      marketing: { ...p.marketing, monthlyBudget: 1500, pctOfRevenue: 0.02 },
    }),
  },
  {
    id: "loan_deferral",
    category: "Financement",
    title: "Différé 6 mois sur emprunt bancaire",
    rationale:
      "Différé partiel d'amortissement: ne payer que les intérêts pendant 6 mois. Soulage tréso ramp ~15 000€.",
    estimatedYearOneSavings: 15000,
    apply: (p) => ({
      ...p,
      financing: {
        ...p.financing,
        loans: (p.financing.loans ?? []).map((l) =>
          l.id === "loan_bank" ? { ...l, startMonth: 6 } : l
        ),
      },
    }),
  },
  {
    id: "treasury_buffer",
    category: "Financement",
    title: "Augmenter levée à 500k€ (buffer)",
    rationale:
      "Ajout 100k€ obligation supplémentaire (ou apport associé) pour absorber chocs ramp. Pas une économie mais réduit risque exécution.",
    estimatedYearOneSavings: 0,
    apply: (p) => ({
      ...p,
      financing: {
        ...p.financing,
        equity: [
          ...(p.financing.equity ?? []),
          { id: `eq_${Date.now()}`, name: "Buffer apport supplémentaire", amount: 100000, startMonth: 0 },
        ],
      },
    }),
  },
];

const SEV_ICONS = {
  high: <AlertTriangle className="h-5 w-5 text-red-600" />,
  medium: <AlertCircle className="h-5 w-5 text-amber-600" />,
  low: <Info className="h-5 w-5 text-blue-600" />,
};

const SEV_BADGES = {
  high: <Badge variant="destructive">Critique</Badge>,
  medium: <Badge className="bg-amber-500 hover:bg-amber-600">Modéré</Badge>,
  low: <Badge variant="secondary">Mineur</Badge>,
};

const CAT_BADGES: Record<Saving["category"], string> = {
  "Masse salariale": "bg-[#D32F2F]",
  Charges: "bg-amber-500",
  Investissement: "bg-blue-500",
  Loyer: "bg-purple-500",
  Financement: "bg-emerald-600",
};

export default function AuditPage() {
  const params = useModelStore((s) => s.params);
  const setParams = useModelStore((s) => s.setParams);
  const baseResult = useMemo(() => computeModel(DEFAULT_PARAMS), []);
  const currentResult = useMemo(() => computeModel(params), [params]);
  const baseLast = baseResult.yearly[baseResult.yearly.length - 1];
  const curLast = currentResult.yearly[currentResult.yearly.length - 1];
  const baseFirst = baseResult.yearly[0];
  const curFirst = currentResult.yearly[0];

  const totalEstSavings = SAVINGS.reduce((s, x) => s + x.estimatedYearOneSavings, 0);

  const applyAll = () => {
    let p = params;
    for (const s of SAVINGS) {
      p = s.apply(p);
    }
    setParams(() => p);
    toast.success(`${SAVINGS.length} optimisations appliquées`);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit & axes d&apos;économies</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Failles + leviers actionables pour les premières années
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <Tabs defaultValue="savings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="savings">
            <TrendingDown className="h-3.5 w-3.5 mr-1.5" />
            Axes d&apos;économies ({SAVINGS.length})
          </TabsTrigger>
          <TabsTrigger value="findings">Findings ({FINDINGS.length})</TabsTrigger>
          <TabsTrigger value="comparison">Comparaison Base vs Actuel</TabsTrigger>
        </TabsList>

        <TabsContent value="savings" className="space-y-4">
          <Card className="bg-emerald-50/40 border-emerald-300">
            <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-700" />
                  <h3 className="font-heading uppercase tracking-wider text-sm font-bold text-emerald-900">
                    Économies cumulées potentielles année 1
                  </h3>
                </div>
                <div className="text-3xl font-bold text-emerald-700 mt-1">
                  {fmtCurrency(totalEstSavings, { compact: true })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Estimation cumulée de toutes les optimisations ci-dessous (ordre de grandeur).
                </p>
              </div>
              <Button onClick={applyAll} className="bg-emerald-700 hover:bg-emerald-800">
                <Sparkles className="h-4 w-4 mr-2" />
                Tout appliquer
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {SAVINGS.map((s) => (
              <Card key={s.id}>
                <CardContent className="pt-5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className={CAT_BADGES[s.category]}>{s.category}</Badge>
                      {s.estimatedYearOneSavings > 0 && (
                        <span className="text-sm font-bold text-emerald-700">
                          ~{fmtCurrency(s.estimatedYearOneSavings, { compact: true })}/an
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setParams((p) => s.apply(p));
                        toast.success(`Appliqué: ${s.title}`);
                      }}
                    >
                      Appliquer
                    </Button>
                  </div>
                  <h4 className="font-semibold text-sm">{s.title}</h4>
                  <p className="text-xs text-muted-foreground">{s.rationale}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="findings">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Findings ({FINDINGS.length})</CardTitle>
              <CardDescription>Risques identifiés dans le BP actuel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {FINDINGS.map((f, i) => (
                <div key={i} className="flex gap-3 p-4 border rounded-md">
                  <div className="mt-0.5">{SEV_ICONS[f.severity]}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{f.title}</h4>
                      {SEV_BADGES[f.severity]}
                    </div>
                    <p className="text-sm text-muted-foreground">{f.body}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="font-medium">Correction:</span>
                      <span>{f.fix}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comparaison Base (xlsx) vs Scénario actuel</CardTitle>
              <CardDescription>Impact des modifications appliquées sur les KPIs clés</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicateur</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Actuel</TableHead>
                    <TableHead className="text-right">Δ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { label: `CA ${baseLast.label}`, b: baseLast.totalRevenue, a: curLast.totalRevenue },
                    { label: `EBITDA ${baseLast.label}`, b: baseLast.ebitda, a: curLast.ebitda },
                    {
                      label: `Marge EBITDA ${baseLast.label}`,
                      b: baseLast.ebitdaMargin,
                      a: curLast.ebitdaMargin,
                      isPct: true,
                    },
                    { label: `Salaires ${baseFirst.label}`, b: baseFirst.salaries, a: curFirst.salaries },
                    { label: `EBITDA ${baseFirst.label}`, b: baseFirst.ebitda, a: curFirst.ebitda },
                    { label: "Trésorerie min.", b: baseResult.cashTroughValue, a: currentResult.cashTroughValue },
                    { label: `Trésorerie fin ${baseLast.label}`, b: baseLast.cashEnd, a: curLast.cashEnd },
                  ].map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.label}</TableCell>
                      <TableCell className="text-right">
                        {r.isPct ? fmtPct(r.b) : fmtCurrency(r.b, { compact: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.isPct ? fmtPct(r.a) : fmtCurrency(r.a, { compact: true })}
                      </TableCell>
                      <TableCell
                        className={
                          "text-right font-medium " + (r.a - r.b >= 0 ? "text-emerald-600" : "text-red-600")
                        }
                      >
                        {r.isPct ? fmtPct(r.a - r.b) : fmtCurrency(r.a - r.b, { compact: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
