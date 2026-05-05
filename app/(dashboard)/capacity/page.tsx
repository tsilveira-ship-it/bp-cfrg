"use client";
import { useMemo } from "react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { effectiveMonthlyHours } from "@/lib/model/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtNum, fmtPct } from "@/lib/format";
import { InfoLabel } from "@/components/info-label";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "white",
  border: "1px solid #e5e5e5",
  borderRadius: "6px",
  padding: "8px 12px",
  fontSize: "12px",
};

const DEFAULT_CAPACITY = {
  parallelClasses: 1,
  capacityPerClass: 15,
  capacityPerClassMin: 12,
  capacityPerClassMax: 16,
  avgSessionsPerMonth: 8,
};

export default function CapacityPage() {
  const params = useModelStore((s) => s.params);
  const patch = useModelStore((s) => s.patch);
  const setParams = useModelStore((s) => s.setParams);
  const result = useMemo(() => computeModel(params), [params]);

  const cap = params.capacity ?? DEFAULT_CAPACITY;
  const parallel = cap.parallelClasses;
  const capPerClass = cap.capacityPerClass;
  const capMin = cap.capacityPerClassMin ?? capPerClass;
  const capMax = cap.capacityPerClassMax ?? capPerClass;
  const avgSessions = cap.avgSessionsPerMonth;

  const enableCapacity = () => {
    setParams((p) => ({ ...p, capacity: { ...DEFAULT_CAPACITY, ...(p.capacity ?? {}) } }));
  };

  // Heures totales coaching dispo (pools positifs uniquement)
  const totalCoachingHours = (params.salaries.freelancePools ?? [])
    .filter((p) => p.monthlyHours > 0 || (p.hoursPerWeekday ?? 0) > 0)
    .reduce((s, p) => s + Math.max(0, effectiveMonthlyHours(p)), 0);

  // 1h de coaching ouvre `parallelClasses` cours en parallèle, chacun à `capPerClass` membres
  const slotsPerHour = parallel * capPerClass;
  const slotsPerHourMin = parallel * capMin;
  const slotsPerHourMax = parallel * capMax;

  const data = result.monthly.map((m) => {
    const totalMembers = m.subsCount + m.legacyCount;
    const sessionsDemand = totalMembers * avgSessions;
    const sessionsSupply = totalCoachingHours * slotsPerHour;
    const saturation = sessionsSupply > 0 ? sessionsDemand / sessionsSupply : 0;
    return {
      label: m.label,
      Membres: Math.round(totalMembers),
      "Saturation %": Math.round(saturation * 100),
      saturationVal: saturation,
    };
  });

  const maxSat = Math.max(...data.map((d) => d.saturationVal));
  const maxSatMonth = data.find((d) => d.saturationVal === maxSat);

  const maxMembersTheoretical = (totalCoachingHours * slotsPerHour) / avgSessions;
  const maxMembersMin = (totalCoachingHours * slotsPerHourMin) / avgSessions;
  const maxMembersMax = (totalCoachingHours * slotsPerHourMax) / avgSessions;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Capacité opérationnelle</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Heures coaching disponibles vs demande membres — alerte saturation
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hypothèses capacité</CardTitle>
          <p className="text-xs text-muted-foreground">
            Paramètres liés au scénario (sauvegardés via auto-save).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!params.capacity && (
            <div className="rounded-md border border-amber-300 bg-amber-50/40 p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold">Capacité utilise des valeurs par défaut</div>
                <p className="text-amber-700/80 mt-0.5">
                  Pour persister tes propres paramètres dans le scénario (et les exporter),
                  active le bloc capacité.
                </p>
                <button
                  onClick={enableCapacity}
                  className="mt-2 text-xs font-medium underline underline-offset-2 hover:no-underline"
                >
                  Activer la capacité paramétrée
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Cours en parallèle (par créneau)</Label>
              <Input
                type="number"
                min={1}
                max={6}
                value={parallel}
                onChange={(e) =>
                  patch("capacity.parallelClasses", parseInt(e.target.value) || 1)
                }
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Ex: 2 si tu fais tourner 2 WODs simultanés (Hyrox + CrossFit) sur le même créneau.
              </p>
            </div>
            <div>
              <Label className="text-xs">Capacité moyenne par cours</Label>
              <Input
                type="number"
                value={capPerClass}
                onChange={(e) =>
                  patch("capacity.capacityPerClass", parseFloat(e.target.value) || 0)
                }
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Sert au calcul de saturation. Ex: 14 (mid-point 12-16).
              </p>
            </div>
            <div>
              <Label className="text-xs">Capacité min (range)</Label>
              <Input
                type="number"
                value={capMin}
                onChange={(e) =>
                  patch("capacity.capacityPerClassMin", parseFloat(e.target.value) || 0)
                }
              />
              <p className="text-[10px] text-muted-foreground mt-1">Borne basse (ex: 12).</p>
            </div>
            <div>
              <Label className="text-xs">Capacité max (range)</Label>
              <Input
                type="number"
                value={capMax}
                onChange={(e) =>
                  patch("capacity.capacityPerClassMax", parseFloat(e.target.value) || 0)
                }
              />
              <p className="text-[10px] text-muted-foreground mt-1">Borne haute (ex: 16).</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Sessions/membre/mois (moyen)</Label>
              <Input
                type="number"
                step={0.5}
                value={avgSessions}
                onChange={(e) =>
                  patch("capacity.avgSessionsPerMonth", parseFloat(e.target.value) || 0)
                }
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Moyenne pondérée par mix tier. ~8-10 typique.
              </p>
            </div>
            <div>
              <Label className="text-xs">Heures coaching dispo / mois</Label>
              <div className="h-9 px-3 flex items-center rounded-md border bg-muted/40 font-mono text-sm">
                {totalCoachingHours.toFixed(1)}h
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Somme des pools freelance positifs (édité dans /salaries).
              </p>
            </div>
            <div>
              <Label className="text-xs">Slots/h effectifs</Label>
              <div className="h-9 px-3 flex items-center rounded-md border bg-muted/40 font-mono text-sm">
                {slotsPerHour}{" "}
                <span className="text-xs text-muted-foreground ml-2">
                  ({parallel} × {capPerClass})
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Range: {slotsPerHourMin} – {slotsPerHourMax} membres/h.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              <InfoLabel label="Saturation max" />
            </div>
            <div
              className={
                "text-2xl font-bold mt-1 " +
                (maxSat > 1 ? "text-red-700" : maxSat > 0.85 ? "text-amber-700" : "text-emerald-700")
              }
            >
              {fmtPct(maxSat)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {maxSatMonth?.label} ({fmtNum(maxSatMonth?.Membres ?? 0)} membres)
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              <InfoLabel label="Capacité théorique max" />
            </div>
            <div className="text-2xl font-bold mt-1">{fmtNum(maxMembersTheoretical)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              membres simultanés ({fmtNum(maxMembersMin)} – {fmtNum(maxMembersMax)})
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Statut</div>
            <div className="mt-1 flex items-center gap-2">
              {maxSat > 1 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-700" />
                  <span className="text-sm font-semibold text-red-700">Saturation dépassée</span>
                </>
              ) : maxSat > 0.85 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-700" />
                  <span className="text-sm font-semibold text-amber-700">Tension proche du max</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  <span className="text-sm font-semibold text-emerald-700">Capacité OK</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Évolution membres + saturation</CardTitle>
          <p className="text-xs text-muted-foreground">
            La ligne 100% = capacité maximum théorique avec {parallel} cours en parallèle ×{" "}
            {capPerClass} membres/cours. Au-delà → recruter coachs ou ajouter créneaux.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-2">
            <div style={{ width: Math.max(data.length * 22, 800) }}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9 }}
                    interval={2}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11 }}
                  />
                  <ReferenceLine yAxisId="right" y={100} stroke="#dc2626" strokeDasharray="3 3" />
                  <ReferenceLine yAxisId="right" y={85} stroke="#f59e0b" strokeDasharray="3 3" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="Membres" fill="#1a1a1a" />
                  <Bar yAxisId="right" dataKey="Saturation %" fill="#D32F2F" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="pt-5">
          <h3 className="font-semibold text-sm mb-2">Analyse</h3>
          <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
            <li>
              <strong>Saturation &lt; 70%</strong> = sous-utilisation, marge pour grossir sans
              embaucher.
            </li>
            <li>
              <strong>70-85%</strong> = sweet spot. Capacité utilisée mais pas en stress.
            </li>
            <li>
              <strong>85-100%</strong> = tension. Recruter coach freelance avant que ça lâche.
            </li>
            <li>
              <strong>&gt; 100%</strong> = capacité dépassée. Pertes d&apos;abos ou refus
              prospects. Action immédiate requise.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
