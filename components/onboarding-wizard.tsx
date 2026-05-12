"use client";
import { useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  Check,
  Coins,
  Rocket,
  Sparkles,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useModelStore } from "@/lib/store";

const STORAGE_KEY = "bp-onboarding-done-v1";

const STEPS = [
  { id: "welcome", title: "Bienvenue", icon: Rocket },
  { id: "timeline", title: "Timeline", icon: CalendarRange },
  { id: "ramp", title: "Ramp-up abos", icon: TrendingUp },
  { id: "salaries", title: "Masse salariale", icon: UsersRound },
  { id: "financing", title: "Financement", icon: Coins },
  { id: "done", title: "Prêt", icon: Sparkles },
] as const;

export function OnboardingWizard() {
  const params = useModelStore((s) => s.params);
  const setParams = useModelStore((s) => s.setParams);
  const patch = useModelStore((s) => s.patch);
  // Read first-visit flag via useSyncExternalStore (avoids setState-in-effect)
  const isFirstVisit = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return !localStorage.getItem(STORAGE_KEY);
      } catch {
        return false;
      }
    },
    () => false
  );
  const [openOverride, setOpenOverride] = useState<boolean | null>(null);
  const open = openOverride ?? isFirstVisit;
  const setOpen = (v: boolean) => setOpenOverride(v);
  const [step, setStep] = useState(0);

  const close = (skip: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ done: !skip, ts: Date.now() }));
    } catch {}
    setOpen(false);
  };

  const totalSteps = STEPS.length;
  const isLast = step === totalSteps - 1;

  const next = () => {
    if (isLast) close(false);
    else setStep((s) => s + 1);
  };
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const Icon = STEPS[step].icon;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close(true))}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-[#D32F2F]" /> {STEPS[step].title}
          </DialogTitle>
          <div className="flex items-center gap-1 mt-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={
                  "flex-1 h-1 rounded " + (i <= step ? "bg-[#D32F2F]" : "bg-muted")
                }
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Étape {step + 1} / {totalSteps}
          </p>
        </DialogHeader>

        <div className="space-y-3 min-h-[180px]">
          {step === 0 && (
            <div className="text-sm space-y-2">
              <p>
                Cet outil simule le business plan de CFRG sur 7 ans. Tous les inputs sont éditables
                en temps réel et toutes les métriques se recalculent automatiquement.
              </p>
              <p className="text-muted-foreground">
                Ce wizard t&apos;aide à valider en 1 minute les hypothèses clés. Tu peux le passer
                et revenir à tout moment via Configuration → Paramètres.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Quand commence l&apos;exploitation et sur combien d&apos;années veux-tu projeter ?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Année de démarrage (Sept N)</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-transparent px-2 text-sm mt-1"
                    value={params.timeline.startYear}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        timeline: { ...p.timeline, startYear: parseInt(e.target.value) },
                      }))
                    }
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y}>
                        Sept {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Horizon (années)</Label>
                  <Input
                    type="number"
                    min={3}
                    max={10}
                    value={params.timeline.horizonYears}
                    onChange={(e) =>
                      patch("timeline.horizonYears", parseInt(e.target.value || "7"))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Combien d&apos;acquisitions brutes ciblez-vous par mois ? FY0 = Y1, FY1 = Y2…
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Acquisitions/mois FY0</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={params.subs.cohortModel?.acquisitionByFy?.[0] ?? 4}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      const arr = [...(params.subs.cohortModel?.acquisitionByFy ?? [])];
                      arr[0] = v;
                      patch("subs.cohortModel.acquisitionByFy", arr);
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Acquisitions/mois FY1</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={params.subs.cohortModel?.acquisitionByFy?.[1] ?? 6}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      const arr = [...(params.subs.cohortModel?.acquisitionByFy ?? [])];
                      arr[1] = v;
                      patch("subs.cohortModel.acquisitionByFy", arr);
                    }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground italic">
                Réf. CFRG : 4-8 acquisitions/mois en Y1, croissance 20-30% /an. Boxes mature
                Paris atteignent 250-450 membres actifs au total.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {params.salaries.items.length} cadre(s) salarié(s) +{" "}
                {(params.salaries.freelancePools ?? []).length} pool(s) freelance configurés.
              </p>
              <div className="rounded-md border p-3 bg-muted/20 text-xs space-y-1">
                {params.salaries.items.slice(0, 5).map((it) => (
                  <div key={it.id} className="flex justify-between">
                    <span>{it.role}</span>
                    <span className="font-mono">
                      {(it.monthlyGross * (1 + (params.salaries.chargesPatroPct ?? 0.42))).toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€/mois
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pour ajuster ou ajouter, va sur la page <span className="font-mono">/salaries</span> après
                ce wizard.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Combien d&apos;apports en fonds propres au lancement ?
              </p>
              <div className="rounded-md border p-3 bg-muted/20 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Apports equity (total)</span>
                  <span className="font-mono">
                    {(params.financing.equity ?? []).reduce((s, x) => s + x.amount, 0).toLocaleString("fr-FR")}€
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Emprunts bancaires</span>
                  <span className="font-mono">
                    {(params.financing.loans ?? []).reduce((s, x) => s + x.principal, 0).toLocaleString("fr-FR")}€
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Obligations</span>
                  <span className="font-mono">
                    {(params.financing.bonds ?? []).reduce((s, x) => s + x.principal, 0).toLocaleString("fr-FR")}€
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pour modéliser apports/dette en détail, va sur <span className="font-mono">/financing</span>.
              </p>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3 text-sm">
              <p className="font-medium flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-600" /> Tout est prêt !
              </p>
              <ul className="text-muted-foreground space-y-1 text-xs list-disc pl-5">
                <li><b>Dashboard</b> — vue d&apos;ensemble + KPIs</li>
                <li><b>Health check</b> — diagnostic 360°</li>
                <li><b>Monte Carlo</b> — quantifie l&apos;incertitude</li>
                <li><b>Backup</b> — exporte un JSON pour archivage</li>
              </ul>
              <p className="text-xs text-muted-foreground italic">
                Auto-save activé : les modifications sont sauvegardées dans ton fork Supabase.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row! justify-between!">
          <Button variant="ghost" onClick={() => close(true)} className="mr-auto">
            Passer
          </Button>
          {step > 0 && (
            <Button variant="outline" onClick={prev}>
              <ArrowLeft className="h-3.5 w-3.5" /> Précédent
            </Button>
          )}
          <Button onClick={next}>
            {isLast ? (
              <>Commencer <Check className="h-3.5 w-3.5" /></>
            ) : (
              <>Suivant <ArrowRight className="h-3.5 w-3.5" /></>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
