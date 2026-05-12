"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useModelStore } from "@/lib/store";
import { computeModel, monthlyFunnel, type FunnelStep } from "@/lib/model/compute";
import { buildTimeline } from "@/lib/model/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { fmtCurrency, fmtNum, fmtPct } from "@/lib/format";
import { TrendingDown, Users, Phone, ClipboardCheck, UserCheck, Wallet, AlertCircle } from "lucide-react";

/**
 * Page funnel BP — vue d'ensemble du funnel commercial modélisé (Leads → Appels → Bilans → Abos)
 * avec breakdown des coûts annuels (freelance horaire + bonus + ads), revenu bilan, NET marketing,
 * CAC effectif. Distinct de la page `/funnel` (qui documente le CRM live en production).
 *
 * Si `subs.bilanFunnel.leadFunnel.enabled = false`, affiche un état "non configuré" avec lien
 * vers /parameters pour l'activer.
 */
export default function FunnelBpPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);
  const H = result.horizonMonths;
  const Y = params.timeline.horizonYears;
  const tl = buildTimeline(params.timeline.startYear, Y);

  const bf = params.subs.bilanFunnel;
  const lf = bf?.leadFunnel;
  const enabled = bf?.enabled === true && lf?.enabled === true;

  const steps: FunnelStep[] = useMemo(
    () => (enabled ? monthlyFunnel(params, H) : []),
    [params, enabled, H]
  );

  const annual = useMemo(() => {
    if (steps.length === 0) return [];
    const out: Array<{
      fy: number;
      label: string;
      leads: number;
      appels: number;
      hours: number;
      bilans: number;
      acquisitions: number;
      costHourly: number;
      costBonusBilan: number;
      costBonusAbo: number;
      costAds: number;
      total: number;
      revenuBilan: number;
      net: number;
      cac: number;
    }> = [];
    for (let fy = 0; fy < Y; fy++) {
      const slice = steps.slice(fy * 12, (fy + 1) * 12);
      const acquisitions = slice.reduce((s, x) => s + x.acquisitions, 0);
      const net = slice.reduce((s, x) => s + x.netMarketing, 0);
      out.push({
        fy,
        label: tl.fyLabels[fy] ?? `FY${fy}`,
        leads: slice.reduce((s, x) => s + x.leads, 0),
        appels: slice.reduce((s, x) => s + x.appels, 0),
        hours: slice.reduce((s, x) => s + x.hoursFreelance, 0),
        bilans: slice.reduce((s, x) => s + x.bilans, 0),
        acquisitions,
        costHourly: slice.reduce((s, x) => s + x.costFreelanceHourly, 0),
        costBonusBilan: slice.reduce((s, x) => s + x.costBonusBilan, 0),
        costBonusAbo: slice.reduce((s, x) => s + x.costBonusAbo, 0),
        costAds: slice.reduce((s, x) => s + x.costAds, 0),
        total: slice.reduce((s, x) => s + x.totalCost, 0),
        revenuBilan: slice.reduce((s, x) => s + x.revenuBilanHT, 0),
        net,
        cac: acquisitions > 0 ? net / acquisitions : 0,
      });
    }
    return out;
  }, [steps, Y, tl.fyLabels]);

  const totals = useMemo(() => {
    if (annual.length === 0) return null;
    return {
      leads: annual.reduce((s, r) => s + r.leads, 0),
      appels: annual.reduce((s, r) => s + r.appels, 0),
      hours: annual.reduce((s, r) => s + r.hours, 0),
      bilans: annual.reduce((s, r) => s + r.bilans, 0),
      acquisitions: annual.reduce((s, r) => s + r.acquisitions, 0),
      costHourly: annual.reduce((s, r) => s + r.costHourly, 0),
      costBonusBilan: annual.reduce((s, r) => s + r.costBonusBilan, 0),
      costBonusAbo: annual.reduce((s, r) => s + r.costBonusAbo, 0),
      costAds: annual.reduce((s, r) => s + r.costAds, 0),
      total: annual.reduce((s, r) => s + r.total, 0),
      revenuBilan: annual.reduce((s, r) => s + r.revenuBilan, 0),
      net: annual.reduce((s, r) => s + r.net, 0),
    };
  }, [annual]);

  if (!enabled || !lf || !bf) {
    return (
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Funnel commercial BP</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Modélisation : Leads → Appels → Bilans → Abos + coûts détaillés.
            </p>
          </div>
          <ScenarioSwitcher />
        </header>
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
            <h3 className="font-semibold">Funnel non configuré</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Le funnel commercial (leads → appels freelance → bilans → abos) n'est pas activé.
              Active-le dans /parameters → Mode cohort → Funnel Bilan → Funnel commercial.
            </p>
            <Link
              href="/parameters"
              className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
            >
              Configurer le funnel
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Hypothèses dérivées pour explications
  const minutesPerLead = lf.minutesPerLead;
  const hourlyRate = lf.freelanceHourlyRateEur;
  const callPct = lf.callPct;
  const leadToBilan = lf.leadToBilanPct;
  const conversionPct = bf.conversionPct;
  const adsBudget = lf.adsBudgetMonthlyEur;
  const totalConvPct = callPct * leadToBilan * conversionPct;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Funnel commercial BP</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Leads → Appels → Bilans → Abos + coûts (freelance horaire, bonus, ads).
            Configuration : <Link href="/parameters" className="underline">/parameters</Link>.
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      {/* KPIs top */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Leads totaux horizon"
          value={fmtNum(totals?.leads ?? 0)}
          sub={`${(totals?.leads ?? 0 / Y).toFixed(0)}/an moyen`}
        />
        <KpiCard
          icon={<Phone className="h-4 w-4" />}
          label="Heures freelance"
          value={`${fmtNum(totals?.hours ?? 0)} h`}
          sub={`${((totals?.hours ?? 0) / 137).toFixed(1)} FTE-an cumulés`}
        />
        <KpiCard
          icon={<ClipboardCheck className="h-4 w-4" />}
          label="Bilans signés"
          value={fmtNum(totals?.bilans ?? 0)}
          sub={`+${fmtCurrency(totals?.revenuBilan ?? 0, { compact: true })} revenu`}
        />
        <KpiCard
          icon={<UserCheck className="h-4 w-4" />}
          label="Acquisitions"
          value={fmtNum(totals?.acquisitions ?? 0)}
          sub={`Conv. globale ${fmtPct(totalConvPct, 1)}`}
          accent
        />
        <KpiCard
          icon={<Wallet className="h-4 w-4" />}
          label="NET marketing horizon"
          value={fmtCurrency(totals?.net ?? 0, { compact: true })}
          sub={`CAC moyen ${
            (totals?.acquisitions ?? 0) > 0
              ? fmtCurrency((totals?.net ?? 0) / (totals?.acquisitions ?? 1))
              : "—"
          }`}
        />
      </div>

      {/* Hypothèses funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hypothèses du funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <HypRow label="% leads appelés" value={fmtPct(callPct, 0)} />
            <HypRow label="% appel → bilan" value={fmtPct(leadToBilan, 0)} />
            <HypRow label="% bilan → abo" value={fmtPct(conversionPct, 0)} />
            <HypRow
              label="Conv. globale lead → abo"
              value={fmtPct(totalConvPct, 1)}
              accent
            />
            <HypRow label="Taux horaire freelance" value={`${hourlyRate} €/h`} />
            <HypRow label="Minutes / appel" value={`${minutesPerLead} min`} />
            <HypRow
              label="Bonus / bilan"
              value={lf.bonusPerBilanEur ? `${lf.bonusPerBilanEur} €` : "—"}
            />
            <HypRow
              label="Bonus / abo"
              value={lf.bonusPerAboEur ? `${lf.bonusPerAboEur} €` : "—"}
            />
            <HypRow label="Budget ads /mois (FY0)" value={`${adsBudget} €`} />
            <HypRow label="Prix bilan TTC" value={`${bf.bilanPriceTTC.toFixed(2)} €`} />
          </div>
        </CardContent>
      </Card>

      {/* Tableau annuel détaillé */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funnel annuel × {Y} ans</CardTitle>
          <p className="text-xs text-muted-foreground">
            Volumes et coûts agrégés par FY. NET marketing = total coûts − revenu bilan HT.
            CAC = NET / acquisitions.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left px-2 py-1.5">FY</th>
                <th className="text-right px-2">Leads</th>
                <th className="text-right px-2">Appels</th>
                <th className="text-right px-2">Heures</th>
                <th className="text-right px-2">Bilans</th>
                <th className="text-right px-2">Acquis.</th>
                <th className="text-right px-2 border-l">Freelance</th>
                <th className="text-right px-2">Bonus</th>
                <th className="text-right px-2">Ads</th>
                <th className="text-right px-2 border-l">Total</th>
                <th className="text-right px-2">Rev. bilan</th>
                <th className="text-right px-2 border-l font-semibold">NET</th>
                <th className="text-right px-2">CAC</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {annual.map((r) => (
                <tr key={r.fy} className="border-b hover:bg-muted/30">
                  <td className="px-2 py-1.5 font-semibold">{r.label}</td>
                  <td className="text-right px-2">{r.leads.toFixed(0)}</td>
                  <td className="text-right px-2">{r.appels.toFixed(0)}</td>
                  <td className="text-right px-2">{r.hours.toFixed(0)}</td>
                  <td className="text-right px-2">{r.bilans.toFixed(0)}</td>
                  <td className="text-right px-2 font-semibold">{r.acquisitions.toFixed(0)}</td>
                  <td className="text-right px-2 border-l">{fmtCurrency(r.costHourly, { compact: true })}</td>
                  <td className="text-right px-2">
                    {fmtCurrency(r.costBonusBilan + r.costBonusAbo, { compact: true })}
                  </td>
                  <td className="text-right px-2">{fmtCurrency(r.costAds, { compact: true })}</td>
                  <td className="text-right px-2 border-l">{fmtCurrency(r.total, { compact: true })}</td>
                  <td className="text-right px-2 text-emerald-700">
                    −{fmtCurrency(r.revenuBilan, { compact: true })}
                  </td>
                  <td className="text-right px-2 border-l font-semibold">
                    {fmtCurrency(r.net, { compact: true })}
                  </td>
                  <td className="text-right px-2">{fmtCurrency(r.cac)}</td>
                </tr>
              ))}
              {totals ? (
                <tr className="font-bold bg-muted/50">
                  <td className="px-2 py-2">TOTAL</td>
                  <td className="text-right px-2">{totals.leads.toFixed(0)}</td>
                  <td className="text-right px-2">{totals.appels.toFixed(0)}</td>
                  <td className="text-right px-2">{totals.hours.toFixed(0)}</td>
                  <td className="text-right px-2">{totals.bilans.toFixed(0)}</td>
                  <td className="text-right px-2">{totals.acquisitions.toFixed(0)}</td>
                  <td className="text-right px-2 border-l">{fmtCurrency(totals.costHourly, { compact: true })}</td>
                  <td className="text-right px-2">
                    {fmtCurrency(totals.costBonusBilan + totals.costBonusAbo, { compact: true })}
                  </td>
                  <td className="text-right px-2">{fmtCurrency(totals.costAds, { compact: true })}</td>
                  <td className="text-right px-2 border-l">{fmtCurrency(totals.total, { compact: true })}</td>
                  <td className="text-right px-2">−{fmtCurrency(totals.revenuBilan, { compact: true })}</td>
                  <td className="text-right px-2 border-l">{fmtCurrency(totals.net, { compact: true })}</td>
                  <td className="text-right px-2">
                    {totals.acquisitions > 0 ? fmtCurrency(totals.net / totals.acquisitions) : "—"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Funnel visuel FY0 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-[#D32F2F]" />
            Funnel FY0 ({tl.fyLabels[0]}) — vue conique
          </CardTitle>
        </CardHeader>
        <CardContent>
          {annual[0] ? (
            <div className="space-y-2 max-w-2xl mx-auto">
              <FunnelBar
                label="Leads bruts"
                count={annual[0].leads}
                max={annual[0].leads}
                color="bg-blue-500"
              />
              <FunnelBar
                label="Appels effectifs"
                count={annual[0].appels}
                max={annual[0].leads}
                color="bg-purple-500"
                pct={callPct}
              />
              <FunnelBar
                label="Bilans signés"
                count={annual[0].bilans}
                max={annual[0].leads}
                color="bg-amber-500"
                pct={leadToBilan}
              />
              <FunnelBar
                label="Abonnements signés"
                count={annual[0].acquisitions}
                max={annual[0].leads}
                color="bg-emerald-600"
                pct={conversionPct}
                accent
              />
              <div className="text-xs text-muted-foreground text-center mt-3 italic">
                Conversion globale lead → abo : {fmtPct(totalConvPct, 1)} (
                {(annual[0].acquisitions / annual[0].leads * 100).toFixed(1)}% effectif)
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Liens cross-impact */}
      <Card className="bg-muted/30">
        <CardContent className="pt-5">
          <h3 className="font-semibold text-sm mb-2">Voir l'impact ailleurs</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            <Link
              href="/pnl"
              className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted/40 bg-card"
            >
              <span className="font-mono text-[10px] bg-[#D32F2F]/10 px-1.5 py-0.5 rounded">→ /pnl</span>
              Ligne « Marketing » du P&L reflète le total funnel
            </Link>
            <Link
              href="/costs"
              className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted/40 bg-card"
            >
              <span className="font-mono text-[10px] bg-[#D32F2F]/10 px-1.5 py-0.5 rounded">→ /costs</span>
              Marketing dans la décomposition annuelle des coûts
            </Link>
            <Link
              href="/investor"
              className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted/40 bg-card"
            >
              <span className="font-mono text-[10px] bg-[#D32F2F]/10 px-1.5 py-0.5 rounded">→ /investor</span>
              CAC effectif funnel utilisé pour le ratio LTV/CAC
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-[#D32F2F]/40 bg-[#D32F2F]/5" : ""}>
      <CardContent className="pt-4">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          {icon} {label}
        </div>
        <div className="text-xl font-bold font-heading mt-1">{value}</div>
        {sub ? <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}

function HypRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={
        "flex flex-col gap-0.5 p-2 rounded border " +
        (accent ? "border-[#D32F2F]/40 bg-[#D32F2F]/5" : "bg-muted/20")
      }
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono font-semibold">{value}</div>
    </div>
  );
}

function FunnelBar({
  label,
  count,
  max,
  color,
  pct,
  accent,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
  pct?: number;
  accent?: boolean;
}) {
  const widthPct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className={accent ? "font-bold text-[#D32F2F]" : "text-foreground"}>{label}</span>
        <span className="font-mono">
          {count.toFixed(0)}
          {pct !== undefined ? <span className="text-muted-foreground ml-2">×{(pct * 100).toFixed(0)}%</span> : null}
        </span>
      </div>
      <div className="h-6 bg-muted/30 rounded overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${Math.max(2, widthPct)}%` }}
        />
      </div>
    </div>
  );
}
