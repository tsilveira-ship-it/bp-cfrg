"use client";
import { useModelStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtCurrency } from "@/lib/format";
import { Trash2, Plus } from "lucide-react";

export function EquityEditor() {
  const params = useModelStore((s) => s.params);
  const setParams = useModelStore((s) => s.setParams);
  const equity = params.financing.equity ?? [];
  const total = equity.reduce((s, x) => s + x.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Apports / Equity</span>
          <span className="text-sm font-mono text-muted-foreground">Total: {fmtCurrency(total)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Apport personnel + levée associés/investisseurs. Pas de remboursement (capital non remboursable).
        </p>
        {equity.map((e, idx) => (
          <div key={e.id} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-md bg-muted/20">
            <div className="col-span-12 md:col-span-6">
              <Label className="text-xs">Nom</Label>
              <Input
                value={e.name}
                onChange={(ev) =>
                  setParams((p) => ({
                    ...p,
                    financing: {
                      ...p.financing,
                      equity: (p.financing.equity ?? []).map((x, i) =>
                        i === idx ? { ...x, name: ev.target.value } : x
                      ),
                    },
                  }))
                }
              />
            </div>
            <div className="col-span-6 md:col-span-3">
              <Label className="text-xs">Montant (€)</Label>
              <Input
                type="number"
                value={e.amount}
                onChange={(ev) =>
                  setParams((p) => ({
                    ...p,
                    financing: {
                      ...p.financing,
                      equity: (p.financing.equity ?? []).map((x, i) =>
                        i === idx ? { ...x, amount: parseFloat(ev.target.value) || 0 } : x
                      ),
                    },
                  }))
                }
              />
            </div>
            <div className="col-span-5 md:col-span-2">
              <Label className="text-xs">Mois (0=M0)</Label>
              <Input
                type="number"
                min="0"
                value={e.startMonth}
                onChange={(ev) =>
                  setParams((p) => ({
                    ...p,
                    financing: {
                      ...p.financing,
                      equity: (p.financing.equity ?? []).map((x, i) =>
                        i === idx ? { ...x, startMonth: parseInt(ev.target.value || "0") } : x
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
                      equity: (p.financing.equity ?? []).filter((_, i) => i !== idx),
                    },
                  }))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setParams((p) => ({
              ...p,
              financing: {
                ...p.financing,
                equity: [
                  ...(p.financing.equity ?? []),
                  { id: `eq_${Date.now()}`, name: "Nouvel apport", amount: 50000, startMonth: 0 },
                ],
              },
            }))
          }
        >
          <Plus className="h-4 w-4 mr-1" /> Ajouter un apport
        </Button>
      </CardContent>
    </Card>
  );
}
