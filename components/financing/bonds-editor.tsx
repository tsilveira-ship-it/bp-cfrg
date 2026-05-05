"use client";
import { useModelStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fmtCurrency } from "@/lib/format";
import { Trash2, Plus } from "lucide-react";
import type { BondIssue } from "@/lib/model/types";

function projectionAfterDeferral(b: BondIssue): number {
  if (!b.capitalizeInterest) return b.principal;
  const periodRate = b.annualRatePct / 100 / b.frequency;
  const deferralPeriods = Math.round(b.deferralYears * b.frequency);
  return b.principal * Math.pow(1 + periodRate, deferralPeriods);
}

export function BondsEditor() {
  const params = useModelStore((s) => s.params);
  const setParams = useModelStore((s) => s.setParams);
  const bonds = params.financing.bonds ?? [];
  const totalP = bonds.reduce((s, x) => s + x.principal, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Émissions obligataires</span>
          <span className="text-sm font-mono text-muted-foreground">Total levé: {fmtCurrency(totalP)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Obligations non convertibles. Différé optionnel avec capitalisation des intérêts (PIK).
          Remboursement in fine (bullet) ou linéaire.
        </p>
        {bonds.map((b, idx) => {
          const grown = projectionAfterDeferral(b);
          return (
            <div key={b.id} className="p-3 border rounded-md bg-muted/20 space-y-2">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 md:col-span-5">
                  <Label className="text-xs">Nom</Label>
                  <Input
                    value={b.name}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        financing: {
                          ...p.financing,
                          bonds: (p.financing.bonds ?? []).map((x, i) =>
                            i === idx ? { ...x, name: e.target.value } : x
                          ),
                        },
                      }))
                    }
                  />
                </div>
                <div className="col-span-1 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    onClick={() =>
                      setParams((p) => ({
                        ...p,
                        financing: {
                          ...p.financing,
                          bonds: (p.financing.bonds ?? []).filter((_, i) => i !== idx),
                        },
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">Capital levé (€)</Label>
                  <Input
                    type="number"
                    value={b.principal}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        financing: {
                          ...p.financing,
                          bonds: (p.financing.bonds ?? []).map((x, i) =>
                            i === idx ? { ...x, principal: parseFloat(e.target.value) || 0 } : x
                          ),
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Taux annuel (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={b.annualRatePct}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        financing: {
                          ...p.financing,
                          bonds: (p.financing.bonds ?? []).map((x, i) =>
                            i === idx ? { ...x, annualRatePct: parseFloat(e.target.value) || 0 } : x
                          ),
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Durée (années)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={b.termYears}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        financing: {
                          ...p.financing,
                          bonds: (p.financing.bonds ?? []).map((x, i) =>
                            i === idx ? { ...x, termYears: parseFloat(e.target.value) || 0 } : x
                          ),
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Différé (années)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={b.deferralYears}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        financing: {
                          ...p.financing,
                          bonds: (p.financing.bonds ?? []).map((x, i) =>
                            i === idx ? { ...x, deferralYears: parseFloat(e.target.value) || 0 } : x
                          ),
                        },
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
                <div>
                  <Label className="text-xs">Fréquence coupon</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                    value={b.frequency}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        financing: {
                          ...p.financing,
                          bonds: (p.financing.bonds ?? []).map((x, i) =>
                            i === idx ? { ...x, frequency: parseInt(e.target.value) as 1 | 2 | 4 } : x
                          ),
                        },
                      }))
                    }
                  >
                    <option value={1}>Annuel</option>
                    <option value={2}>Semestriel</option>
                    <option value={4}>Trimestriel</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Remboursement</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                    value={b.amortization}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        financing: {
                          ...p.financing,
                          bonds: (p.financing.bonds ?? []).map((x, i) =>
                            i === idx ? { ...x, amortization: e.target.value as "bullet" | "linear" } : x
                          ),
                        },
                      }))
                    }
                  >
                    <option value="bullet">In fine (bullet)</option>
                    <option value="linear">Linéaire</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Démarre mois</Label>
                  <Input
                    type="number"
                    min="0"
                    value={b.startMonth}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        financing: {
                          ...p.financing,
                          bonds: (p.financing.bonds ?? []).map((x, i) =>
                            i === idx ? { ...x, startMonth: parseInt(e.target.value || "0") } : x
                          ),
                        },
                      }))
                    }
                  />
                </div>
                <div className="flex items-center gap-2 px-2 py-2 border rounded-md bg-background">
                  <Switch
                    checked={b.capitalizeInterest}
                    onCheckedChange={(v) =>
                      setParams((p) => ({
                        ...p,
                        financing: {
                          ...p.financing,
                          bonds: (p.financing.bonds ?? []).map((x, i) =>
                            i === idx ? { ...x, capitalizeInterest: v } : x
                          ),
                        },
                      }))
                    }
                  />
                  <Label className="text-xs">PIK (différé capitalisé)</Label>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-dashed">
                <div>
                  <span className="text-muted-foreground">Capital après différé</span>
                  <div className="font-semibold">{fmtCurrency(grown)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Phase service</span>
                  <div className="font-semibold">
                    {(b.termYears - b.deferralYears).toFixed(1)} ans
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Type</span>
                  <div className="font-semibold">
                    {b.amortization === "bullet" ? "In fine" : "Linéaire"}
                    {b.capitalizeInterest && " · PIK"}
                  </div>
                </div>
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
              financing: {
                ...p.financing,
                bonds: [
                  ...(p.financing.bonds ?? []),
                  {
                    id: `bond_${Date.now()}`,
                    name: "Nouvelle obligation",
                    principal: 100000,
                    annualRatePct: 6,
                    termYears: 5,
                    frequency: 1,
                    amortization: "bullet",
                    deferralYears: 2,
                    capitalizeInterest: true,
                    startMonth: 0,
                  },
                ],
              },
            }))
          }
        >
          <Plus className="h-4 w-4 mr-1" /> Ajouter une émission
        </Button>
      </CardContent>
    </Card>
  );
}
