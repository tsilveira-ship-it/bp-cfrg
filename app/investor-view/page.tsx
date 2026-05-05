"use client";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { decodeToken } from "@/lib/share-token";
import { computeModel } from "@/lib/model/compute";
import { fmtCurrency, fmtPct } from "@/lib/format";
import { activeToggles, topKeyHypotheses } from "@/lib/key-hypotheses";

export default function InvestorViewPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <InvestorViewClient />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
      Chargement…
    </div>
  );
}

function InvestorViewClient() {
  const sp = useSearchParams();
  const token = sp.get("d");
  const investorName = sp.get("n") ?? "Confidentiel";

  const decoded = useMemo(() => {
    if (!token) return { ok: false as const, error: "Lien invalide (token manquant)" };
    try {
      const params = decodeToken(token);
      const result = computeModel(params);
      return { ok: true as const, params, result };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Erreur de décodage" };
    }
  }, [token]);

  if (!decoded.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <AlertCircle className="h-10 w-10 mx-auto text-red-500" />
          <h1 className="text-xl font-bold">Lien invalide</h1>
          <p className="text-sm text-muted-foreground">{decoded.error}</p>
        </div>
      </div>
    );
  }

  const { params, result } = decoded;
  const lastFy = result.yearly[result.yearly.length - 1];

  return (
    <div className="relative min-h-screen bg-background">
      {/* Watermark */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.06] select-none"
        style={{
          backgroundImage: `repeating-linear-gradient(-45deg, transparent 0 200px, rgba(211,47,47,1) 200px 220px)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 flex flex-wrap items-center justify-center gap-12 opacity-[0.05] select-none overflow-hidden"
      >
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="text-xl font-heading font-bold uppercase tracking-widest text-[#D32F2F] -rotate-12 whitespace-nowrap"
          >
            Confidentiel — {investorName}
          </div>
        ))}
      </div>

      <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="font-heading font-bold tracking-wide text-sm uppercase">
              CrossFit Rive Gauche — Business Plan
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Snapshot read-only · {result.fyLabels[0]} → {result.fyLabels[result.fyLabels.length - 1]} ·{" "}
              <span className="font-semibold">Confidentiel — {investorName}</span>
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Read-only
          </div>
        </div>
      </header>

      <main className="relative z-[5] max-w-6xl mx-auto px-6 py-8 space-y-6">
        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">
            KPIs — fin {result.fyLabels[result.fyLabels.length - 1]}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="CA" value={fmtCurrency(lastFy?.totalRevenue ?? 0, { compact: true })} />
            <Kpi
              label="EBITDA"
              value={fmtCurrency(lastFy?.ebitda ?? 0, { compact: true })}
              positive={(lastFy?.ebitda ?? 0) >= 0}
            />
            <Kpi label="Marge EBITDA" value={fmtPct(lastFy?.ebitdaMargin ?? 0)} />
            <Kpi
              label="Tréso fin"
              value={fmtCurrency(lastFy?.cashEnd ?? 0, { compact: true })}
              positive={(lastFy?.cashEnd ?? 0) >= 0}
            />
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">
            Compte de résultat synthétique
          </h2>
          <div className="rounded-md border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left p-2">Ligne</th>
                  {result.yearly.map((y) => (
                    <th key={y.fy} className="text-right p-2">
                      {y.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "CA total", key: "totalRevenue" as const },
                  { label: "Salaires", key: "salaries" as const, neg: true },
                  { label: "OPEX total", key: "totalOpex" as const, neg: true },
                  { label: "EBITDA", key: "ebitda" as const, bold: true },
                  { label: "D&A", key: "da" as const, neg: true },
                  { label: "EBIT", key: "ebit" as const },
                  { label: "Intérêts", key: "interestExpense" as const, neg: true },
                  { label: "Impôts", key: "tax" as const, neg: true },
                  { label: "Résultat net", key: "netIncome" as const, bold: true },
                ].map((row) => (
                  <tr key={row.key} className={row.bold ? "font-semibold border-t" : ""}>
                    <td className="p-2">{row.label}</td>
                    {result.yearly.map((y, i) => {
                      const v = y[row.key] as number;
                      return (
                        <td
                          key={i}
                          className={
                            "text-right p-2 " +
                            (row.neg && v > 0 ? "text-red-700" : v < 0 ? "text-red-700" : "")
                          }
                        >
                          {row.neg && v > 0
                            ? `(${fmtCurrency(v, { compact: true })})`
                            : fmtCurrency(v, { compact: true })}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">
            Trésorerie & investissement
          </h2>
          <div className="rounded-md border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left p-2">Flux</th>
                  {result.yearly.map((y) => (
                    <th key={y.fy} className="text-right p-2">
                      {y.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "CFO", key: "cfo" as const },
                  { label: "CFI (CAPEX/invest)", key: "cfi" as const },
                  { label: "CFF (financement)", key: "cff" as const },
                  { label: "Variation tréso", key: "netCashFlow" as const, bold: true },
                  { label: "Tréso fin d'exercice", key: "cashEnd" as const, bold: true },
                ].map((row) => (
                  <tr key={row.key} className={row.bold ? "font-semibold border-t" : ""}>
                    <td className="p-2">{row.label}</td>
                    {result.yearly.map((y, i) => {
                      const v = y[row.key] as number;
                      return (
                        <td
                          key={i}
                          className={"text-right p-2 " + (v < 0 ? "text-red-700" : "")}
                        >
                          {fmtCurrency(v, { compact: true })}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">
            Top 10 hypothèses critiques
          </h2>
          <div className="rounded-md border bg-card overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left p-2 w-8">#</th>
                  <th className="text-left p-2">Hypothèse</th>
                  <th className="text-right p-2">Valeur</th>
                  <th className="text-left p-2">Contexte</th>
                </tr>
              </thead>
              <tbody>
                {topKeyHypotheses(params, 10).map((h) => (
                  <tr key={h.rank} className="border-t">
                    <td className="p-2 font-bold text-[#D32F2F]">{h.rank}</td>
                    <td className="p-2 font-medium">{h.label}</td>
                    <td className="p-2 text-right font-mono font-semibold">{h.value}</td>
                    <td className="p-2 text-muted-foreground italic">{h.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">
            Configuration du modèle
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {activeToggles(params).map((t) => (
              <div
                key={t.key}
                className={
                  "rounded border p-2 text-xs " +
                  (t.on
                    ? "bg-emerald-50/40 border-emerald-300"
                    : "bg-muted/20 border-muted text-muted-foreground")
                }
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className={
                      "h-1.5 w-1.5 rounded-full " + (t.on ? "bg-emerald-500" : "bg-muted-foreground/40")
                    }
                  />
                  <span className="font-medium">{t.label}</span>
                </div>
                {t.hint && <div className="text-[10px] text-muted-foreground mt-0.5 ml-3">{t.hint}</div>}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 italic">
            Pastille verte = toggle activé dans le scénario. Tout calcul reflète cet état.
          </p>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">
            Hypothèses clés (synthèse)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <Hypo label="Démarrage" value={`Sept ${params.timeline.startYear} (FY${params.timeline.startYear % 100})`} />
            <Hypo label="Horizon" value={`${params.timeline.horizonYears} ans`} />
            <Hypo
              label="Ramp-up abos"
              value={`${params.subs.rampStartCount} → ${params.subs.rampEndCount} membres`}
            />
            <Hypo
              label="Total apports + dette"
              value={fmtCurrency(
                (params.financing.equity ?? []).reduce((s, x) => s + x.amount, 0) +
                  (params.financing.loans ?? []).reduce((s, x) => s + x.principal, 0) +
                  (params.financing.bonds ?? []).reduce((s, x) => s + x.principal, 0),
                { compact: true }
              )}
            />
            <Hypo
              label="CAPEX initial"
              value={fmtCurrency(
                params.capex.equipment + params.capex.travaux + params.capex.juridique + params.capex.depots,
                { compact: true }
              )}
            />
            <Hypo
              label="Break-even"
              value={
                result.breakEvenMonth !== null
                  ? `M${result.breakEvenMonth} (${result.monthLabels[result.breakEvenMonth] ?? ""})`
                  : "Non atteint sur l'horizon"
              }
            />
          </div>
        </section>

        <footer className="text-[10px] text-muted-foreground text-center pt-8 pb-4 space-y-2">
          <div>
            Document confidentiel destiné à <b>{investorName}</b>. Toute reproduction interdite sans
            autorisation écrite.
          </div>
          <div className="text-muted-foreground/70">
            Méthodologie open-source — moteur de calcul public sur{" "}
            <a
              href="https://github.com/tsilveira-ship-it/bp-cfrg"
              target="_blank"
              rel="noreferrer noopener"
              className="underline hover:text-foreground"
            >
              github.com/tsilveira-ship-it/bp-cfrg
            </a>
            . Auditer les formules: <span className="font-mono">lib/model/compute.ts</span>.
          </div>
        </footer>
      </main>
    </div>
  );
}

function Kpi({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div
        className={
          "text-xl font-heading font-bold mt-1 " +
          (positive === false ? "text-red-700" : positive === true ? "text-emerald-700" : "")
        }
      >
        {value}
      </div>
    </div>
  );
}

function Hypo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-3 flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-mono font-semibold">{value}</span>
    </div>
  );
}
