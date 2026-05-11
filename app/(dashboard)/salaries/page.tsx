"use client";
import { useMemo, useState } from "react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import {
  buildTimeline,
  monthlyEmployerCost,
  netToGross,
  grossToCost,
  costToGross,
  DEFAULT_CHARGES,
  effectiveMonthlyHours,
  type SalaryItem,
  type SalaryCategory,
} from "@/lib/model/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtCurrency, fmtNum } from "@/lib/format";
import { StartMonthPicker } from "@/components/start-month-picker";
import { FreelancePoolsEditor } from "@/components/freelance-pools-editor";
import { InfoLabel } from "@/components/info-label";
import { Trash2, Plus, Calculator, Users, UserCog } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const CAT_LABEL: Record<SalaryCategory, string> = {
  cadre: "Cadre",
  "non-cadre": "Non-cadre",
  tns: "TNS (gérant majoritaire)",
  apprenti: "Apprenti",
  stagiaire: "Stagiaire",
};

export default function SalariesPage() {
  const params = useModelStore((s) => s.params);
  const setParams = useModelStore((s) => s.setParams);
  const result = useMemo(() => computeModel(params), [params]);
  const tl = buildTimeline(params.timeline.startYear, params.timeline.horizonYears);
  const profiles = params.salaries.chargesProfiles ?? DEFAULT_CHARGES;

  // Estimateur
  const [estNet, setEstNet] = useState(2500);
  const [estCategory, setEstCategory] = useState<SalaryCategory>("cadre");
  const estProfile = profiles.find((p) => p.category === estCategory) ?? DEFAULT_CHARGES[0];
  const estGross = netToGross(estNet, estProfile.salaryPct);
  const estCost = grossToCost(estGross, estProfile.patroPct);

  const items = params.salaries.items;
  const pools = params.salaries.freelancePools ?? [];

  // Monthly chart data
  const monthlyData = result.monthly.map((m, mi) => {
    const fy = Math.floor(mi / 12);
    const idxF = Math.pow(1 + params.salaries.annualIndexPa, Math.max(0, fy - 1));
    let cadres = 0;
    for (const it of items) {
      if (mi < it.startMonth) continue;
      if (it.endMonth !== undefined && mi > it.endMonth) continue;
      cadres += monthlyEmployerCost(it, profiles, params.salaries.chargesPatroPct, idxF, fy);
    }
    let freelance = 0;
    for (const pool of pools) {
      if (pool.startMonth !== undefined && mi < pool.startMonth) continue;
      freelance += pool.hourlyRate * effectiveMonthlyHours(pool) * idxF;
    }
    return { label: m.label, Cadres: cadres, Freelance: freelance };
  });

  const chartWidth = Math.max(monthlyData.length * 22, 800);

  // Yearly summary
  const yearlySummary = result.yearly.map((y) => {
    const slice = monthlyData.filter((_, i) => Math.floor(i / 12) === y.fy);
    return {
      label: y.label,
      cadres: slice.reduce((s, x) => s + x.Cadres, 0),
      freelance: slice.reduce((s, x) => s + x.Freelance, 0),
      total: slice.reduce((s, x) => s + x.Cadres + x.Freelance, 0),
    };
  });

  const updateItem = (idx: number, patch: Partial<SalaryItem>) =>
    setParams((p) => ({
      ...p,
      salaries: {
        ...p.salaries,
        items: p.salaries.items.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
      },
    }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Masse salariale</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Outil de saisie et estimation — cadres salariés + coachs freelance
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              <InfoLabel label="Effectif cadre (FTE)" />
            </div>
            <div className="text-2xl font-bold mt-1">
              {fmtNum(items.reduce((s, x) => s + x.fte, 0), 1)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{items.length} poste(s)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              <InfoLabel label="Coût mensuel cadre" />
            </div>
            <div className="text-2xl font-bold mt-1">
              {fmtCurrency((yearlySummary[0]?.cadres ?? 0) / 12)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Année 1 moyen</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              <InfoLabel label="Coût mensuel freelance" />
            </div>
            <div className="text-2xl font-bold mt-1">
              {fmtCurrency((yearlySummary[0]?.freelance ?? 0) / 12)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{pools.length} pool(s)</div>
          </CardContent>
        </Card>
        <Card className="bg-[#D32F2F]/5 border-[#D32F2F]/30">
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider"><InfoLabel label="Total annuel 1" /></div>
            <div className="text-2xl font-bold mt-1 text-[#D32F2F]">
              {fmtCurrency(yearlySummary[0]?.total ?? 0, { compact: true })}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Coût employeur total</div>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="cadres" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cadres">
            <UserCog className="h-3.5 w-3.5 mr-1.5" />
            Cadres salariés
          </TabsTrigger>
          <TabsTrigger value="freelance">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Coachs freelance
          </TabsTrigger>
          <TabsTrigger value="charges">Taux charges</TabsTrigger>
          <TabsTrigger value="estimator">
            <Calculator className="h-3.5 w-3.5 mr-1.5" />
            Estimateur net/brut/coût
          </TabsTrigger>
          <TabsTrigger value="timeline">Évolution</TabsTrigger>
        </TabsList>

        <TabsContent value="cadres" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Postes cadres ({items.length})</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setParams((p) => ({
                      ...p,
                      salaries: {
                        ...p.salaries,
                        items: [
                          ...p.salaries.items,
                          {
                            id: `s_${Date.now()}`,
                            role: "Nouveau poste",
                            monthlyGross: 3000,
                            fte: 1,
                            startMonth: 0,
                            category: "cadre",
                          },
                        ],
                      },
                    }))
                  }
                >
                  <Plus className="h-4 w-4 mr-1" /> Ajouter un poste
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <Label className="text-xs">Indexation annuelle globale (%)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.5"
                      value={params.salaries.annualIndexPa * 100}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          salaries: {
                            ...p.salaries,
                            annualIndexPa: (parseFloat(e.target.value) || 0) / 100,
                          },
                        }))
                      }
                      className="pr-7"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              </div>

              {items.map((it, idx) => {
                const fy = 0;
                const idxF = 1;
                const cost = monthlyEmployerCost(it, profiles, params.salaries.chargesPatroPct, idxF, fy);
                const cat = it.category ?? "cadre";
                const profile = profiles.find((p) => p.category === cat) ?? DEFAULT_CHARGES[0];
                return (
                  <div key={it.id} className="p-3 border rounded-md bg-muted/20 space-y-2">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-12 md:col-span-4">
                        <Label className="text-xs">Rôle</Label>
                        <Input
                          value={it.role}
                          onChange={(e) => updateItem(idx, { role: e.target.value })}
                        />
                      </div>
                      <div className="col-span-6 md:col-span-2">
                        <Label className="text-xs">Catégorie</Label>
                        <select
                          className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                          value={cat}
                          onChange={(e) => updateItem(idx, { category: e.target.value as SalaryCategory })}
                        >
                          {(Object.keys(CAT_LABEL) as SalaryCategory[]).map((c) => (
                            <option key={c} value={c}>{CAT_LABEL[c]}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-6 md:col-span-2">
                        <Label className="text-xs">Brut mensuel (€)</Label>
                        <Input
                          type="number"
                          value={it.monthlyGross}
                          onChange={(e) =>
                            updateItem(idx, { monthlyGross: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="col-span-4 md:col-span-1">
                        <Label className="text-xs">FTE</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={it.fte}
                          onChange={(e) => updateItem(idx, { fte: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="col-span-7 md:col-span-2 text-right">
                        <Label className="text-[10px] text-muted-foreground">Coût employeur/mo</Label>
                        <div className="h-9 px-3 flex items-center justify-end rounded-md border bg-muted/40 text-xs font-mono">
                          {fmtCurrency(cost)}
                        </div>
                      </div>
                      <div className="col-span-1 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() =>
                            setParams((p) => ({
                              ...p,
                              salaries: {
                                ...p.salaries,
                                items: p.salaries.items.filter((_, i) => i !== idx),
                              },
                            }))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-dashed">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Brut FY26 (override)</Label>
                        <Input
                          type="number"
                          placeholder="—"
                          value={it.fy26Bump ?? ""}
                          onChange={(e) =>
                            updateItem(idx, {
                              fy26Bump: e.target.value === "" ? undefined : parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">% augmentation/an</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.5"
                            placeholder="global"
                            value={
                              it.annualRaisePct !== undefined ? (it.annualRaisePct * 100).toFixed(1) : ""
                            }
                            onChange={(e) =>
                              updateItem(idx, {
                                annualRaisePct:
                                  e.target.value === "" ? undefined : (parseFloat(e.target.value) || 0) / 100,
                              })
                            }
                            className="pr-7"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Prime annuelle (€)</Label>
                        <Input
                          type="number"
                          value={it.yearlyBonus ?? 0}
                          onChange={(e) =>
                            updateItem(idx, { yearlyBonus: parseFloat(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="flex items-center gap-2 px-2 py-2 border rounded-md bg-background self-end">
                        <Switch
                          checked={it.thirteenthMonth ?? false}
                          onCheckedChange={(v) => updateItem(idx, { thirteenthMonth: v })}
                        />
                        <Label className="text-xs">13e mois</Label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-dashed">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Mutuelle (€/mo)</Label>
                        <Input
                          type="number"
                          value={it.mutuelle ?? 0}
                          onChange={(e) => updateItem(idx, { mutuelle: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Transport (€/mo)</Label>
                        <Input
                          type="number"
                          value={it.transport ?? 0}
                          onChange={(e) => updateItem(idx, { transport: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Tickets resto (€/mo)</Label>
                        <Input
                          type="number"
                          value={it.ticketsResto ?? 0}
                          onChange={(e) => updateItem(idx, { ticketsResto: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground self-end pb-1">
                        Charges patro: {(profile.patroPct * 100).toFixed(0)}%
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-dashed">
                      <StartMonthPicker
                        value={it.startMonth}
                        onChange={(n) => updateItem(idx, { startMonth: n })}
                        label="Démarre au mois"
                      />
                      <div>
                        <Label className="text-xs">Termine au mois (optionnel)</Label>
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            min="0"
                            max={tl.horizonMonths - 1}
                            placeholder="jusqu'à fin"
                            value={it.endMonth ?? ""}
                            onChange={(e) =>
                              updateItem(idx, {
                                endMonth: e.target.value === "" ? undefined : parseInt(e.target.value),
                              })
                            }
                            className="w-20"
                          />
                          <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                            ={" "}
                            {it.endMonth !== undefined
                              ? tl.monthLabels[it.endMonth] ?? "—"
                              : `fin (${tl.monthLabels[tl.horizonMonths - 1]})`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="freelance">
          <FreelancePoolsEditor />
        </TabsContent>

        <TabsContent value="charges">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Taux de charges par catégorie</CardTitle>
              <p className="text-xs text-muted-foreground">
                Charges patronales = surcoût employeur sur le brut. Charges salariales = retenue sur le brut (info).
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {profiles.map((pr, idx) => (
                  <div key={pr.category} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-md">
                    <div className="col-span-4">
                      <Label className="text-xs">Catégorie</Label>
                      <div className="h-9 flex items-center px-3 rounded-md border bg-muted/40 text-sm">
                        {CAT_LABEL[pr.category]}
                      </div>
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs">Charges patronales (%)</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.5"
                          value={(pr.patroPct * 100).toFixed(1)}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              salaries: {
                                ...p.salaries,
                                chargesProfiles: (p.salaries.chargesProfiles ?? DEFAULT_CHARGES).map((x, i) =>
                                  i === idx ? { ...x, patroPct: (parseFloat(e.target.value) || 0) / 100 } : x
                                ),
                              },
                            }))
                          }
                          className="pr-7"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs">Charges salariales (%)</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.5"
                          value={(pr.salaryPct * 100).toFixed(1)}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              salaries: {
                                ...p.salaries,
                                chargesProfiles: (p.salaries.chargesProfiles ?? DEFAULT_CHARGES).map((x, i) =>
                                  i === idx ? { ...x, salaryPct: (parseFloat(e.target.value) || 0) / 100 } : x
                                ),
                              },
                            }))
                          }
                          className="pr-7"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() =>
                  setParams((p) => ({
                    ...p,
                    salaries: { ...p.salaries, chargesProfiles: DEFAULT_CHARGES },
                  }))
                }
              >
                Restaurer valeurs par défaut
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estimator">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Estimateur net → brut → coût</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Saisis le net souhaité, calcule brut + coût employeur.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Net mensuel souhaité (€)</Label>
                    <Input
                      type="number"
                      value={estNet}
                      onChange={(e) => setEstNet(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Catégorie</Label>
                    <select
                      className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                      value={estCategory}
                      onChange={(e) => setEstCategory(e.target.value as SalaryCategory)}
                    >
                      {(Object.keys(CAT_LABEL) as SalaryCategory[]).map((c) => (
                        <option key={c} value={c}>{CAT_LABEL[c]}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Net</span>
                    <span className="font-mono">{fmtCurrency(estNet)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">+ Charges salariales ({(estProfile.salaryPct * 100).toFixed(0)}%)</span>
                    <span className="font-mono">+{fmtCurrency(estGross - estNet)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-1 border-t">
                    <span>Brut mensuel</span>
                    <span className="font-mono">{fmtCurrency(estGross)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">+ Charges patronales ({(estProfile.patroPct * 100).toFixed(0)}%)</span>
                    <span className="font-mono">+{fmtCurrency(estCost - estGross)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#D32F2F] pt-1 border-t">
                    <span>Coût employeur</span>
                    <span className="font-mono">{fmtCurrency(estCost)}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground pt-2">
                  Annuel coût employeur: <span className="font-mono font-semibold text-foreground">{fmtCurrency(estCost * 12)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reverse: coût employeur → brut → net</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Budget coût employeur mensuel (€)</Label>
                  <Input
                    type="number"
                    value={estCost.toFixed(0)}
                    onChange={(e) => {
                      const newCost = parseFloat(e.target.value) || 0;
                      const newGross = costToGross(newCost, estProfile.patroPct);
                      const newNet = newGross * (1 - estProfile.salaryPct);
                      setEstNet(newNet);
                    }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Ajuste le net qui correspond à ce budget pour un {CAT_LABEL[estCategory]}.
                </div>
                <Button
                  className="w-full"
                  onClick={() =>
                    setParams((p) => ({
                      ...p,
                      salaries: {
                        ...p.salaries,
                        items: [
                          ...p.salaries.items,
                          {
                            id: `s_${Date.now()}`,
                            role: `Nouveau poste (~${Math.round(estNet)}€ net)`,
                            monthlyGross: Math.round(estGross),
                            fte: 1,
                            startMonth: 0,
                            category: estCategory,
                          },
                        ],
                      },
                    }))
                  }
                >
                  <Plus className="h-4 w-4 mr-1" /> Créer un poste avec ces valeurs
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Évolution masse salariale (mensuel)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto pb-2">
                <div style={{ width: chartWidth }}>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={2} angle={-45} textAnchor="end" height={50} />
                      <YAxis tickFormatter={(v) => fmtCurrency(v, { compact: true })} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => fmtCurrency(Number(v))} contentStyle={{ fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Cadres" stackId="s" fill="#D32F2F" />
                      <Bar dataKey="Freelance" stackId="s" fill="#1a1a1a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Synthèse annuelle</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Année</TableHead>
                    <TableHead className="text-right">Cadres</TableHead>
                    <TableHead className="text-right">Freelance</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yearlySummary.map((y, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{y.label}</TableCell>
                      <TableCell className="text-right">{fmtCurrency(y.cadres, { compact: true })}</TableCell>
                      <TableCell className="text-right">{fmtCurrency(y.freelance, { compact: true })}</TableCell>
                      <TableCell className="text-right font-bold">{fmtCurrency(y.total, { compact: true })}</TableCell>
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
