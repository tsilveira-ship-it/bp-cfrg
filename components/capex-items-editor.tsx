"use client";
import { Plus, Trash2 } from "lucide-react";
import { useModelStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { expandCapex, type CapexItem } from "@/lib/model/types";
import { fmtCurrency } from "@/lib/format";

const DEFAULT_AMORT_BY_CATEGORY: Record<CapexItem["category"], number> = {
  equipment: 5,
  travaux: 10,
  juridique: 0,
  depots: 0,
};

const CATEGORY_LABELS: Record<CapexItem["category"], string> = {
  equipment: "Équipement",
  travaux: "Travaux",
  juridique: "Juridique",
  depots: "Dépôts",
};

export function CapexItemsEditor() {
  const params = useModelStore((s) => s.params);
  const setParams = useModelStore((s) => s.setParams);
  const items = params.capexItems;
  const expanded = expandCapex(params);

  const enableDetail = () => {
    // Démarre depuis l'expansion automatique des pools globaux
    setParams((p) => ({ ...p, capexItems: expandCapex(p).map((it) => ({ ...it, id: rid() })) }));
  };

  const disableDetail = () => {
    setParams((p) => {
      const next = { ...p };
      delete next.capexItems;
      // Reconsolide les pools globaux à partir des items
      const totals = { equipment: 0, travaux: 0, juridique: 0, depots: 0 };
      for (const it of expanded) totals[it.category] += it.amount;
      next.capex = totals;
      return next;
    });
  };

  const addItem = () => {
    setParams((p) => ({
      ...p,
      capexItems: [
        ...(p.capexItems ?? []),
        {
          id: rid(),
          name: "Nouveau poste",
          category: "equipment",
          amount: 0,
          amortYears: DEFAULT_AMORT_BY_CATEGORY.equipment,
        },
      ],
    }));
  };

  const removeItem = (id: string) => {
    setParams((p) => ({
      ...p,
      capexItems: (p.capexItems ?? []).filter((it) => it.id !== id),
    }));
  };

  const updateItem = (id: string, patch: Partial<CapexItem>) => {
    setParams((p) => ({
      ...p,
      capexItems: (p.capexItems ?? []).map((it) =>
        it.id === id ? { ...it, ...patch } : it
      ),
    }));
  };

  if (!items) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm space-y-2 bg-muted/20">
        <p className="text-xs text-muted-foreground">
          Mode simplifié: équipement et travaux amortis avec une durée globale unique.
          Pour ventiler le CAPEX par poste (machines 7y, info 3y, mobilier 10y...), passe en
          mode détaillé.
        </p>
        <Button variant="outline" size="sm" onClick={enableDetail}>
          Activer le détail par poste CAPEX
        </Button>
      </div>
    );
  }

  const total = items.reduce((s, it) => s + it.amount, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {items.length} poste(s) — total {fmtCurrency(total)}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-3.5 w-3.5" /> Ajouter un poste
          </Button>
          <Button variant="ghost" size="sm" onClick={disableDetail}>
            Mode simplifié
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((it) => (
          <div
            key={it.id}
            className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-end p-3 rounded-md border bg-card"
          >
            <div>
              <Label className="text-xs">Libellé</Label>
              <Input
                value={it.name}
                onChange={(e) => updateItem(it.id, { name: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Catégorie</Label>
              <select
                value={it.category}
                onChange={(e) =>
                  updateItem(it.id, {
                    category: e.target.value as CapexItem["category"],
                    amortYears: DEFAULT_AMORT_BY_CATEGORY[e.target.value as CapexItem["category"]],
                  })
                }
                className="h-9 w-full rounded-md border bg-transparent px-2 text-sm"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Montant (€)</Label>
              <Input
                type="number"
                value={it.amount}
                onChange={(e) =>
                  updateItem(it.id, { amount: parseFloat(e.target.value || "0") })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Amort. (années, 0 = non amorti)</Label>
              <Input
                type="number"
                value={it.amortYears}
                onChange={(e) =>
                  updateItem(it.id, { amortYears: parseFloat(e.target.value || "0") })
                }
              />
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => removeItem(it.id)}
              aria-label="Supprimer"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function rid() {
  return `cx_${Math.random().toString(36).slice(2, 9)}`;
}
