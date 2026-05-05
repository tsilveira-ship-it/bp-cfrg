"use client";
import { useModelStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtCurrency } from "@/lib/format";
import { Trash2, Plus } from "lucide-react";

function computeMensualite(principal: number, annualRatePct: number, n: number): number {
  const r = annualRatePct / 100 / 12;
  if (r <= 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export function LoansEditor() {
  const params = useModelStore((s) => s.params);
  const setParams = useModelStore((s) => s.setParams);
  const loans = params.financing.loans ?? [];
  const totalP = loans.reduce((s, x) => s + x.principal, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Emprunts bancaires</span>
          <span className="text-sm font-mono text-muted-foreground">Total: {fmtCurrency(totalP)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Amortissable mensuel (mensualités constantes capital + intérêts).
        </p>
        {loans.map((l, idx) => {
          const m = computeMensualite(l.principal, l.annualRatePct, l.termMonths);
          const totalCost = m * l.termMonths - l.principal;
          return (
            <div key={l.id} className="p-3 border rounded-md bg-muted/20 space-y-2">
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 md:col-span-5">
                  <Label className="text-xs">Nom</Label>
                  <Input
                    value={l.name}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        financing: {
                          ...p.financing,
                          loans: (p.financing.loans ?? []).map((x, i) =>
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
                          loans: (p.financing.loans ?? []).filter((_, i) => i !== idx),
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
                  <Label className="text-xs">Capital (€)</Label>
                  <Input
                    type="number"
                    value={l.principal}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        financing: {
                          ...p.financing,
                          loans: (p.financing.loans ?? []).map((x, i) =>
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
                    value={l.annualRatePct}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        financing: {
                          ...p.financing,
                          loans: (p.financing.loans ?? []).map((x, i) =>
                            i === idx ? { ...x, annualRatePct: parseFloat(e.target.value) || 0 } : x
                          ),
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Durée (mois)</Label>
                  <Input
                    type="number"
                    value={l.termMonths}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        financing: {
                          ...p.financing,
                          loans: (p.financing.loans ?? []).map((x, i) =>
                            i === idx ? { ...x, termMonths: parseInt(e.target.value || "0") } : x
                          ),
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Démarre mois</Label>
                  <Input
                    type="number"
                    min="0"
                    value={l.startMonth}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        financing: {
                          ...p.financing,
                          loans: (p.financing.loans ?? []).map((x, i) =>
                            i === idx ? { ...x, startMonth: parseInt(e.target.value || "0") } : x
                          ),
                        },
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-dashed">
                <div>
                  <span className="text-muted-foreground">Mensualité</span>
                  <div className="font-semibold">{fmtCurrency(m, { decimals: 2 })}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Coût total intérêts</span>
                  <div className="font-semibold">{fmtCurrency(totalCost)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total à rembourser</span>
                  <div className="font-semibold">{fmtCurrency(l.principal + totalCost)}</div>
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
                loans: [
                  ...(p.financing.loans ?? []),
                  {
                    id: `loan_${Date.now()}`,
                    name: "Nouvel emprunt",
                    principal: 100000,
                    annualRatePct: 3,
                    termMonths: 60,
                    startMonth: 0,
                  },
                ],
              },
            }))
          }
        >
          <Plus className="h-4 w-4 mr-1" /> Ajouter un emprunt
        </Button>
      </CardContent>
    </Card>
  );
}
