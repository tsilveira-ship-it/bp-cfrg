"use client";
import { useMemo } from "react";
import { Plus, Trash2, PieChart as PieIcon, TrendingDown } from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useModelStore } from "@/lib/store";
import type { DilutionEvent, Shareholder, ShareholderType } from "@/lib/model/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { fmtCurrency, fmtPct } from "@/lib/format";

const TYPE_LABEL: Record<ShareholderType, string> = {
  founder: "Fondateur",
  investor: "Investisseur",
  employee: "Salarié",
  advisor: "Advisor",
  pool: "Pool/BSPCE",
};

const TYPE_COLOR: Record<ShareholderType, string> = {
  founder: "#D32F2F",
  investor: "#1a1a1a",
  employee: "#16a34a",
  advisor: "#f59e0b",
  pool: "#6b7280",
};

function rid(prefix = "sh") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_TABLE = {
  shareholders: [
    { id: "sh_founder1", name: "Fondateur 1", type: "founder" as const, shares: 50000 },
    { id: "sh_founder2", name: "Fondateur 2", type: "founder" as const, shares: 50000 },
  ],
  events: [],
};

export default function CapTablePage() {
  const params = useModelStore((s) => s.params);
  const setParams = useModelStore((s) => s.setParams);
  const ct = params.capTable ?? DEFAULT_TABLE;

  const enableTable = () => {
    setParams((p) => ({ ...p, capTable: p.capTable ?? DEFAULT_TABLE }));
  };

  const updateShareholder = (id: string, patch: Partial<Shareholder>) => {
    setParams((p) => ({
      ...p,
      capTable: {
        ...(p.capTable ?? DEFAULT_TABLE),
        shareholders: (p.capTable ?? DEFAULT_TABLE).shareholders.map((sh) =>
          sh.id === id ? { ...sh, ...patch } : sh
        ),
      },
    }));
  };

  const addShareholder = () => {
    setParams((p) => ({
      ...p,
      capTable: {
        ...(p.capTable ?? DEFAULT_TABLE),
        shareholders: [
          ...(p.capTable ?? DEFAULT_TABLE).shareholders,
          { id: rid("sh"), name: "Nouvel actionnaire", type: "investor" as const, shares: 0 },
        ],
      },
    }));
  };

  const removeShareholder = (id: string) => {
    setParams((p) => ({
      ...p,
      capTable: {
        ...(p.capTable ?? DEFAULT_TABLE),
        shareholders: (p.capTable ?? DEFAULT_TABLE).shareholders.filter((sh) => sh.id !== id),
      },
    }));
  };

  const addEvent = () => {
    setParams((p) => ({
      ...p,
      capTable: {
        ...(p.capTable ?? DEFAULT_TABLE),
        events: [
          ...(p.capTable ?? DEFAULT_TABLE).events,
          {
            id: rid("ev"),
            name: "Levée série A",
            newSharesIssued: 20000,
            pricePerShare: 10,
            beneficiary: "Fonds VC",
            beneficiaryType: "investor" as const,
            active: false,
          },
        ],
      },
    }));
  };

  const updateEvent = (id: string, patch: Partial<DilutionEvent>) => {
    setParams((p) => ({
      ...p,
      capTable: {
        ...(p.capTable ?? DEFAULT_TABLE),
        events: (p.capTable ?? DEFAULT_TABLE).events.map((e) =>
          e.id === id ? { ...e, ...patch } : e
        ),
      },
    }));
  };

  const removeEvent = (id: string) => {
    setParams((p) => ({
      ...p,
      capTable: {
        ...(p.capTable ?? DEFAULT_TABLE),
        events: (p.capTable ?? DEFAULT_TABLE).events.filter((e) => e.id !== id),
      },
    }));
  };

  // Compute pre/post views
  const preTotal = ct.shareholders.reduce((s, sh) => s + sh.shares, 0);
  const activeEvents = ct.events.filter((e) => e.active);

  const postShareholders = useMemo(() => {
    const map = new Map<string, Shareholder>(
      ct.shareholders.map((sh) => [sh.id, { ...sh }])
    );
    for (const ev of activeEvents) {
      const beneName = ev.beneficiary ?? "Bénéficiaire";
      // Trouver ou créer
      let target = Array.from(map.values()).find((sh) => sh.name === beneName);
      if (!target) {
        target = {
          id: rid("ev_bene"),
          name: beneName,
          type: ev.beneficiaryType ?? "investor",
          shares: 0,
        };
        map.set(target.id, target);
      }
      target.shares += ev.newSharesIssued;
    }
    return Array.from(map.values());
  }, [ct.shareholders, activeEvents]);

  const postTotal = postShareholders.reduce((s, sh) => s + sh.shares, 0);

  const valuationPostMoney = activeEvents.reduce((max, ev) => {
    if (ev.pricePerShare === undefined) return max;
    const post = ev.pricePerShare * postTotal;
    return Math.max(max, post);
  }, 0);
  const lastActiveEventWithPrice = [...activeEvents].reverse().find((e) => e.pricePerShare !== undefined);
  const totalRaised = activeEvents.reduce(
    (s, ev) => s + (ev.pricePerShare ?? 0) * ev.newSharesIssued,
    0
  );

  const pieData = postShareholders
    .filter((sh) => sh.shares > 0)
    .map((sh) => ({
      name: sh.name,
      value: sh.shares,
      color: TYPE_COLOR[sh.type],
    }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <PieIcon className="h-7 w-7 text-[#D32F2F]" /> Cap table
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Actionnariat actuel + simulation dilutions futures (levées, option pool).
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      {!params.capTable && (
        <Card className="border-amber-300 bg-amber-50/30">
          <CardContent className="pt-5 flex items-start gap-3">
            <TrendingDown className="h-5 w-5 text-amber-700 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-amber-800">Cap table non initialisé</p>
              <p className="text-xs text-amber-700/80 mt-1">
                Utilise le template par défaut (2 fondateurs 50/50) pour démarrer. Les modifications sont
                liées au scénario actif.
              </p>
              <Button onClick={enableTable} variant="outline" size="sm" className="mt-2">
                Initialiser la cap table
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Total parts (avant dilutions)
            </div>
            <div className="text-2xl font-heading font-bold">{preTotal.toLocaleString("fr-FR")}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {ct.shareholders.length} actionnaire(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Total parts (après dilutions actives)
            </div>
            <div className="text-2xl font-heading font-bold">{postTotal.toLocaleString("fr-FR")}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              +{(postTotal - preTotal).toLocaleString("fr-FR")} parts émises ({activeEvents.length} levée(s))
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Valorisation post-money
            </div>
            <div className="text-2xl font-heading font-bold">
              {valuationPostMoney > 0 ? fmtCurrency(valuationPostMoney, { compact: true }) : "—"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {lastActiveEventWithPrice
                ? `${fmtCurrency(lastActiveEventWithPrice.pricePerShare ?? 0)}/part — total levé ${fmtCurrency(totalRaised, { compact: true })}`
                : "Renseigne un prix par part dans une levée active"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Actionnaires</CardTitle>
            <p className="text-xs text-muted-foreground">
              Édite les noms, types et nombres de parts. Utilise le filtre type pour le code couleur.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Parts</TableHead>
                  <TableHead className="text-right">% avant</TableHead>
                  <TableHead className="text-right">% après dilutions</TableHead>
                  <TableHead className="text-right">Δ</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {ct.shareholders.map((sh) => {
                  const post = postShareholders.find((p) => p.id === sh.id);
                  const pctBefore = preTotal > 0 ? sh.shares / preTotal : 0;
                  const pctAfter = postTotal > 0 ? (post?.shares ?? 0) / postTotal : 0;
                  const delta = pctAfter - pctBefore;
                  return (
                    <TableRow key={sh.id}>
                      <TableCell>
                        <Input
                          value={sh.name}
                          onChange={(e) => updateShareholder(sh.id, { name: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <select
                          value={sh.type}
                          onChange={(e) =>
                            updateShareholder(sh.id, { type: e.target.value as ShareholderType })
                          }
                          className="h-8 w-full rounded border bg-transparent px-2 text-xs"
                        >
                          {Object.entries(TYPE_LABEL).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={sh.shares}
                          onChange={(e) =>
                            updateShareholder(sh.id, { shares: parseFloat(e.target.value) || 0 })
                          }
                          className="h-8 text-xs text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">{fmtPct(pctBefore)}</TableCell>
                      <TableCell className="text-right text-xs font-mono">{fmtPct(pctAfter)}</TableCell>
                      <TableCell
                        className={
                          "text-right text-xs " +
                          (delta < -0.001 ? "text-red-700" : delta > 0.001 ? "text-emerald-700" : "")
                        }
                      >
                        {Math.abs(delta) < 0.0005 ? "—" : fmtPct(delta)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeShareholder(sh.id)}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="font-semibold border-t-2 bg-muted/30">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right">{preTotal.toLocaleString("fr-FR")}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell />
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
            <Button onClick={addShareholder} variant="outline" size="sm" className="mt-3">
              <Plus className="h-3.5 w-3.5" /> Ajouter un actionnaire
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition (post-dilution)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => Number(v).toLocaleString("fr-FR") + " parts"}
                  contentStyle={{ backgroundColor: "white", borderRadius: 6, border: "1px solid #e5e5e5", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Événements de dilution (simulation)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Ajoute des levées futures, option pool, etc. Active le toggle pour les inclure dans le calcul
            «&nbsp;post-dilution&nbsp;».
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {ct.events.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              Aucun événement de dilution. Ajoute-en un pour simuler une levée Series A, un pool BSPCE...
            </p>
          )}
          {ct.events.map((ev) => (
            <div
              key={ev.id}
              className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1.5fr_auto_auto] gap-2 items-end p-3 rounded border bg-card"
            >
              <div>
                <Label className="text-xs">Nom de l&apos;événement</Label>
                <Input
                  value={ev.name}
                  onChange={(e) => updateEvent(ev.id, { name: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Nouvelles parts</Label>
                <Input
                  type="number"
                  value={ev.newSharesIssued}
                  onChange={(e) =>
                    updateEvent(ev.id, { newSharesIssued: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Prix/part (€)</Label>
                <Input
                  type="number"
                  step={0.5}
                  value={ev.pricePerShare ?? ""}
                  placeholder="—"
                  onChange={(e) =>
                    updateEvent(ev.id, {
                      pricePerShare:
                        e.target.value === "" ? undefined : parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Bénéficiaire</Label>
                <Input
                  value={ev.beneficiary ?? ""}
                  placeholder="Fonds VC"
                  onChange={(e) => updateEvent(ev.id, { beneficiary: e.target.value })}
                />
              </div>
              <div className="flex flex-col items-center gap-1">
                <Label className="text-xs">Actif</Label>
                <Switch
                  checked={ev.active}
                  onCheckedChange={(v) => updateEvent(ev.id, { active: v })}
                />
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeEvent(ev.id)}
                aria-label="Supprimer"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button onClick={addEvent} variant="outline" size="sm">
            <Plus className="h-3.5 w-3.5" /> Ajouter un événement
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
