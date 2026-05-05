"use client";
import { useModelStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtCurrency } from "@/lib/format";
import { Trash2, Plus } from "lucide-react";
import { effectiveMonthlyHours } from "@/lib/model/types";
import { StartMonthPicker } from "@/components/start-month-picker";

export function FreelancePoolsEditor() {
  const params = useModelStore((s) => s.params);
  const setParams = useModelStore((s) => s.setParams);
  const pools = params.salaries.freelancePools ?? [];

  const totalNet = pools.reduce((s, pool) => s + pool.hourlyRate * effectiveMonthlyHours(pool), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">Coachs freelance — pools horaires</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Saisi en heures par jour ouvré + weekend (× 5 et × 2 sem) ou directement en heures/mois.
              Heures négatives = déduction (heures incluses dans cadre salarié).
            </p>
          </div>
          <span className="text-sm font-mono text-muted-foreground">
            Net: {fmtCurrency(totalNet)}/mo
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {pools.map((pool, idx) => {
          const usingWeekly = pool.hoursPerWeekday !== undefined && pool.hoursPerWeekendDay !== undefined;
          const computedMonthly = effectiveMonthlyHours(pool);
          const total = pool.hourlyRate * computedMonthly;
          return (
            <div key={pool.id} className="p-3 border rounded-md bg-muted/20 space-y-2">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 md:col-span-6">
                  <Label className="text-xs">Pool</Label>
                  <Input
                    value={pool.name}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        salaries: {
                          ...p.salaries,
                          freelancePools: (p.salaries.freelancePools ?? []).map((x, i) =>
                            i === idx ? { ...x, name: e.target.value } : x
                          ),
                        },
                      }))
                    }
                  />
                </div>
                <div className="col-span-6 md:col-span-2">
                  <Label className="text-xs">Tarif (€/h)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={pool.hourlyRate}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        salaries: {
                          ...p.salaries,
                          freelancePools: (p.salaries.freelancePools ?? []).map((x, i) =>
                            i === idx ? { ...x, hourlyRate: parseFloat(e.target.value) || 0 } : x
                          ),
                        },
                      }))
                    }
                  />
                </div>
                <div className="col-span-5 md:col-span-3 text-right">
                  <Label className="text-xs text-muted-foreground">Coût/mo</Label>
                  <div
                    className={
                      "h-9 px-3 flex items-center justify-end rounded-md border bg-muted/40 text-xs font-mono " +
                      (total < 0 ? "text-red-600" : "")
                    }
                  >
                    {fmtCurrency(total)}
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
                          freelancePools: (p.salaries.freelancePools ?? []).filter((_, i) => i !== idx),
                        },
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end pt-2 border-t border-dashed">
                <div>
                  <Label className="text-[10px] text-muted-foreground">h/jour ouvré (×5)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="—"
                    value={pool.hoursPerWeekday ?? ""}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        salaries: {
                          ...p.salaries,
                          freelancePools: (p.salaries.freelancePools ?? []).map((x, i) =>
                            i === idx
                              ? {
                                  ...x,
                                  hoursPerWeekday:
                                    e.target.value === "" ? undefined : parseFloat(e.target.value) || 0,
                                }
                              : x
                          ),
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">h/jour weekend (×2)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="—"
                    value={pool.hoursPerWeekendDay ?? ""}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        salaries: {
                          ...p.salaries,
                          freelancePools: (p.salaries.freelancePools ?? []).map((x, i) =>
                            i === idx
                              ? {
                                  ...x,
                                  hoursPerWeekendDay:
                                    e.target.value === "" ? undefined : parseFloat(e.target.value) || 0,
                                }
                              : x
                          ),
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">
                    {usingWeekly ? "Heures/mo (auto)" : "Heures/mo (direct)"}
                  </Label>
                  {usingWeekly ? (
                    <div className="h-9 px-3 flex items-center rounded-md border bg-muted/40 text-xs font-mono">
                      {computedMonthly.toFixed(2)}h
                    </div>
                  ) : (
                    <Input
                      type="number"
                      step="0.1"
                      value={pool.monthlyHours}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          salaries: {
                            ...p.salaries,
                            freelancePools: (p.salaries.freelancePools ?? []).map((x, i) =>
                              i === idx ? { ...x, monthlyHours: parseFloat(e.target.value) || 0 } : x
                            ),
                          },
                        }))
                      }
                    />
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground self-center">
                  {usingWeekly
                    ? `(${pool.hoursPerWeekday ?? 0}×5 + ${pool.hoursPerWeekendDay ?? 0}×2) × 4.3 sem/mo`
                    : "Mode direct (sans hebdo)"}
                </div>
              </div>

              <div className="pt-2 border-t border-dashed">
                <StartMonthPicker
                  value={pool.startMonth ?? 0}
                  onChange={(n) =>
                    setParams((p) => ({
                      ...p,
                      salaries: {
                        ...p.salaries,
                        freelancePools: (p.salaries.freelancePools ?? []).map((x, i) =>
                          i === idx ? { ...x, startMonth: n } : x
                        ),
                      },
                    }))
                  }
                  label="Démarre au mois"
                />
              </div>
            </div>
          );
        })}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setParams((p) => ({
              ...p,
              salaries: {
                ...p.salaries,
                freelancePools: [
                  ...(p.salaries.freelancePools ?? []),
                  {
                    id: `pool_${Date.now()}`,
                    name: "Nouveau pool",
                    hourlyRate: 25,
                    monthlyHours: 0,
                    startMonth: 0,
                  },
                ],
              },
            }))
          }
        >
          <Plus className="h-4 w-4 mr-1" /> Ajouter un pool freelance
        </Button>
      </CardContent>
    </Card>
  );
}
