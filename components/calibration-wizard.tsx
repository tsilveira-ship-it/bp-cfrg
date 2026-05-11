"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { useModelStore } from "@/lib/store";
import { fmtCurrency, fmtPct } from "@/lib/format";

/**
 * Wizard de calibration en 5 étapes pour utilisateurs non-experts.
 *
 * Au lieu de plonger directement dans /parameters et de reconstituer une cohérence
 * cohort + bilan funnel + retention curve + saisonnalité à la main, l'utilisateur
 * répond à 5 questions concrètes et le wizard remplit cohortModel + bilanFunnel +
 * retentionCurve + seasonality + churn en une passe.
 *
 * Volontairement opinionated : les questions correspondent aux signaux que
 * l'investisseur va vérifier (preuves CRM réelles disponibles côté CFRG). Permet
 * de partir d'une calibration défendable en < 2 min plutôt qu'un BP "magique".
 */
export function CalibrationWizard() {
  const params = useModelStore((s) => s.params);
  const setParams = useModelStore((s) => s.setParams);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // États locaux — appliqués au store à l'étape finale uniquement (pour ne pas polluer
  // le scénario en cas d'abandon).
  const [legacyCount, setLegacyCount] = useState(params.legacy.startCount);
  const [bilansPerMonth, setBilansPerMonth] = useState(
    params.subs.bilanFunnel?.monthlyBilansStart ?? 12
  );
  const [conversionPct, setConversionPct] = useState(
    (params.subs.bilanFunnel?.conversionPct ?? 0.45) * 100
  );
  const [retM3, setRetM3] = useState(75);
  const [retM12, setRetM12] = useState(55);
  const [retM24, setRetM24] = useState(42);
  const [hasSummerDrop, setHasSummerDrop] = useState(true);
  const [hasSeptemberPeak, setHasSeptemberPeak] = useState(true);

  const steps = [
    { id: "legacy", label: "Stock actuel" },
    { id: "funnel", label: "Funnel Bilan → abo" },
    { id: "retention", label: "Rétention observée" },
    { id: "seasonality", label: "Saisonnalité" },
    { id: "review", label: "Récapitulatif & application" },
  ];

  const apply = () => {
    setParams((p) => {
      const Y = p.timeline.horizonYears;
      const growthLen = Math.max(0, Y - 1);

      // Build retention curve from 3 anchors (M0=100, M3, M12, M24).
      // Linear interp between anchors, extrapolation tail clamped via evalRetention.
      const anchors: Record<number, number> = {
        0: 1,
        3: retM3 / 100,
        12: retM12 / 100,
        24: retM24 / 100,
      };
      const knownT = [0, 3, 12, 24];
      const curveLen = 25;
      const curve = new Array<number>(curveLen).fill(0);
      for (let t = 0; t < curveLen; t++) {
        let lo = knownT[0];
        let hi = knownT[knownT.length - 1];
        for (const kt of knownT) {
          if (kt <= t) lo = kt;
          if (kt >= t) {
            hi = kt;
            break;
          }
        }
        if (lo === hi) curve[t] = anchors[lo];
        else {
          const ratio = (t - lo) / (hi - lo);
          curve[t] = anchors[lo] + (anchors[hi] - anchors[lo]) * ratio;
        }
      }

      // Implied monthly churn from retention M12 (for legacy display + fallbacks)
      const impliedChurn = retM12 > 0 ? Math.max(0, 1 - Math.pow(retM12 / 100, 1 / 12)) : 0.025;

      // Seasonality : Sept peak 1.20, summer dip 0.65/0.60 if enabled
      const baseSeas = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
      if (hasSeptemberPeak) {
        baseSeas[0] = 1.2; // Sept
        baseSeas[4] = 1.15; // Janv
      }
      if (hasSummerDrop) {
        baseSeas[9] = 0.8; // Juin
        baseSeas[10] = 0.65; // Juil
        baseSeas[11] = 0.6; // Août
      }

      return {
        ...p,
        legacy: { ...p.legacy, startCount: legacyCount },
        subs: {
          ...p.subs,
          monthlyChurnPct: impliedChurn,
          seasonality: baseSeas,
          bilanFunnel: {
            enabled: true,
            monthlyBilansStart: bilansPerMonth,
            monthlyBilansEnd: Math.round(bilansPerMonth * 2.5),
            bilansGrowthByFy:
              p.subs.bilanFunnel?.bilansGrowthByFy ?? new Array(growthLen).fill(0.2),
            conversionPct: conversionPct / 100,
            bilanPriceTTC: p.subs.bilanFunnel?.bilanPriceTTC ?? 19.9,
          },
          cohortModel: {
            enabled: true,
            // Shape simplifié : 1 valeur d'acquisition/mois par FY, plus de ramp interne.
            // FY0 = bilans × conversion. FY1+ croissance composée 15%/an par défaut.
            // Utilisateur affine ensuite via /parameters (tableau acquisitionByFy).
            acquisitionByFy: (() => {
              const Y = p.timeline.horizonYears;
              const base = Math.max(1, bilansPerMonth * (conversionPct / 100));
              const arr = new Array<number>(Y).fill(base);
              for (let i = 1; i < Y; i++) arr[i] = arr[i - 1] * 1.15;
              return arr.map((v) => Math.round(v * 10) / 10);
            })(),
            // Champs deprecated conservés en types pour rétro-compat lecture
            acquisitionStart: Math.max(1, bilansPerMonth * (conversionPct / 100)),
            acquisitionEnd: Math.max(1, bilansPerMonth * (conversionPct / 100)),
            acquisitionGrowthByFy:
              p.subs.cohortModel?.acquisitionGrowthByFy ??
              new Array(growthLen).fill(0.15),
            acquisitionSeasonality: undefined,
            retentionCurve: curve,
          },
        },
      };
    });
    setOpen(false);
    setStep(0);
  };

  const next = () => setStep((s) => Math.min(steps.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <>
      <Button
        variant="default"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Wizard calibration
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#D32F2F]" />
            Calibration BP en 5 étapes
          </DialogTitle>
          <DialogDescription>
            Répond aux questions concrètes — le wizard configure cohort, bilan funnel,
            courbe de rétention et saisonnalité d'un coup. Idéal pour partir d'un BP
            défendable plutôt que d'un modèle "magique".
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 my-3">
          {steps.map((s, i) => (
            <div key={s.id} className="flex-1 flex items-center">
              <div
                className={
                  "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold " +
                  (i < step
                    ? "bg-emerald-600 text-white"
                    : i === step
                    ? "bg-[#D32F2F] text-white"
                    : "bg-muted text-muted-foreground")
                }
              >
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              {i < steps.length - 1 ? (
                <div
                  className={
                    "flex-1 h-0.5 mx-1 " + (i < step ? "bg-emerald-600" : "bg-muted")
                  }
                />
              ) : null}
            </div>
          ))}
        </div>
        <div className="text-xs font-semibold text-center text-muted-foreground -mt-1 mb-3">
          Étape {step + 1} / {steps.length} — {steps[step].label}
        </div>

        {/* Step content */}
        <div className="min-h-[280px] space-y-4">
          {step === 0 && (
            <div className="space-y-3">
              <Label className="text-sm">
                Combien de membres actifs dans la box <em>aujourd'hui</em> (avant CFRG) ?
              </Label>
              <Input
                type="number"
                value={legacyCount}
                onChange={(e) => setLegacyCount(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Ce sont les membres legacy qui transitent (ou pas) vers la nouvelle marque.
                Source : Javelot / ResaWod export membres actifs.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div>
                <Label className="text-sm">
                  Combien de Bilans (séances découverte 19,90€) vendus en moyenne / mois actuellement ?
                </Label>
                <Input
                  type="number"
                  value={bilansPerMonth}
                  onChange={(e) => setBilansPerMonth(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Source : crm.payments filtrés sur produit "Bilan". ~10-20/mois est un range typique.
                </p>
              </div>
              <div>
                <Label className="text-sm">
                  Taux de conversion Bilan → abonnement (%) ?
                </Label>
                <Input
                  type="number"
                  step="0.5"
                  value={conversionPct}
                  onChange={(e) => setConversionPct(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Dashboard CRM CFRG cible : ~45%. Confirme avec la donnée live.
                </p>
              </div>
              <div className="text-[11px] bg-muted/40 rounded p-2 font-mono">
                Acquisitions implicites/mois : {(bilansPerMonth * (conversionPct / 100)).toFixed(1)}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Si tu prends 100 membres acquis au mois M0, combien restent après 3 / 12 / 24 mois ?
                Si tu ne sais pas, garde les valeurs CrossFit médiane.
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">% à M3</Label>
                  <Input
                    type="number"
                    value={retM3}
                    onChange={(e) => setRetM3(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs">% à M12</Label>
                  <Input
                    type="number"
                    value={retM12}
                    onChange={(e) => setRetM12(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs">% à M24</Label>
                  <Input
                    type="number"
                    value={retM24}
                    onChange={(e) => setRetM24(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="text-[11px] bg-muted/40 rounded p-2 font-mono">
                Churn mensuel implicite (depuis M12) :{" "}
                {retM12 > 0
                  ? ((1 - Math.pow(retM12 / 100, 1 / 12)) * 100).toFixed(2)
                  : "—"}
                % / mois
              </div>
              <p className="text-[10px] text-muted-foreground">
                Benchmark CrossFit communautaire : M3=75% / M12=55% / M24=42%. Chain fitness :
                M3=45% / M12=18% / M24=10%.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                La saisonnalité observée dans le CRM (creux été, pic rentrée). Active selon les
                pics réels de fréquentation sur dashboard CFRG.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="summer"
                  checked={hasSummerDrop}
                  onChange={(e) => setHasSummerDrop(e.target.checked)}
                />
                <Label htmlFor="summer" className="text-sm font-normal">
                  Creux été (Juin -20%, Juil -35%, Août -40%)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rentrée"
                  checked={hasSeptemberPeak}
                  onChange={(e) => setHasSeptemberPeak(e.target.checked)}
                />
                <Label htmlFor="rentrée" className="text-sm font-normal">
                  Pic rentrée Septembre (+20%) + bonne résolution Janvier (+15%)
                </Label>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-2 text-xs">
              <p className="font-semibold text-sm">Récapitulatif de la calibration :</p>
              <ul className="space-y-1 list-disc pl-5">
                <li>
                  Legacy stock : <strong>{fmtNumLocal(legacyCount)}</strong> membres
                </li>
                <li>
                  Funnel Bilan activé : <strong>{fmtNumLocal(bilansPerMonth)}</strong> bilans/mois ×{" "}
                  {fmtPct(conversionPct / 100, 0)} conv ={" "}
                  <strong>
                    {(bilansPerMonth * (conversionPct / 100)).toFixed(1)} acquisitions/mois
                  </strong>
                </li>
                <li>
                  Cohort + courbe rétention M3={retM3}% M12={retM12}% M24={retM24}%
                </li>
                <li>
                  Churn implicite :{" "}
                  <strong>
                    {retM12 > 0
                      ? ((1 - Math.pow(retM12 / 100, 1 / 12)) * 100).toFixed(2)
                      : "—"}
                    %/mois
                  </strong>
                </li>
                <li>
                  Saisonnalité : creux été {hasSummerDrop ? "actif" : "—"}, pic rentrée{" "}
                  {hasSeptemberPeak ? "actif" : "—"}
                </li>
              </ul>
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                Appliquer écrasera : <code>legacy.startCount</code>,{" "}
                <code>subs.monthlyChurnPct</code>, <code>subs.seasonality</code>,{" "}
                <code>subs.bilanFunnel</code>, <code>subs.cohortModel</code>. Les autres
                paramètres restent inchangés.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {step > 0 ? (
            <Button variant="outline" onClick={back} size="sm">
              <ChevronLeft className="h-4 w-4" />
              Retour
            </Button>
          ) : null}
          {step < steps.length - 1 ? (
            <Button onClick={next} size="sm">
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={apply} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              <Check className="h-4 w-4" />
              Appliquer la calibration
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function fmtNumLocal(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
}
