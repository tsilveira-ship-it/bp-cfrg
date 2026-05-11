"use client";
import { useModelStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ParamNumber } from "@/components/param-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScenarioSwitcher } from "@/components/scenario-switcher";
import { CalibrationWizard } from "@/components/calibration-wizard";
import { ValidatedCell } from "@/components/validated-cell";
import { SubsEvolutionEditor } from "@/components/subs-evolution-editor";
import { CapexItemsEditor } from "@/components/capex-items-editor";
import { SectionHeader } from "@/components/section-header";
import { StartMonthPicker } from "@/components/start-month-picker";
import { Trash2, Plus } from "lucide-react";
import { fmtPct, fmtCurrency } from "@/lib/format";
import { expandCapex, type ModelParams, type LegacyCohort } from "@/lib/model/types";
import { expectedRetentionMonths } from "@/lib/model/compute";

export default function ParametersPage() {
  const params = useModelStore((s) => s.params);
  const setParams = useModelStore((s) => s.setParams);
  const patch = useModelStore((s) => s.patch);

  const totalMix = params.subs.tiers.reduce((s, t) => s + t.mixPct, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tous les inputs du modèle. Modifications en temps réel + auto-save (si fork chargé).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CalibrationWizard />
          <ScenarioSwitcher />
        </div>
      </header>

      <Card className="bg-blue-50/40 border-blue-300">
        <CardContent className="pt-5 space-y-2">
          <h3 className="font-semibold text-sm">📋 Guide propriétaire</h3>
          <p className="text-xs text-muted-foreground">
            Cette page liste tous les inputs. Pour les sujets complexes, des outils dédiés existent:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
            <a href="/salaries" className="text-xs flex items-center gap-2 p-2 border rounded-md hover:bg-muted/40 bg-card">
              <span className="font-mono text-[10px] bg-[#D32F2F]/10 px-1.5 py-0.5 rounded">→ /salaries</span>
              Outil masse salariale (cadres, freelance, estimateur net/brut)
            </a>
            <a href="/financing" className="text-xs flex items-center gap-2 p-2 border rounded-md hover:bg-muted/40 bg-card">
              <span className="font-mono text-[10px] bg-[#D32F2F]/10 px-1.5 py-0.5 rounded">→ /financing</span>
              Apports + emprunts + obligations + simulateur
            </a>
            <a href="/sensitivity" className="text-xs flex items-center gap-2 p-2 border rounded-md hover:bg-muted/40 bg-card">
              <span className="font-mono text-[10px] bg-[#D32F2F]/10 px-1.5 py-0.5 rounded">→ /sensitivity</span>
              Stress test + sliders ± sur drivers
            </a>
            <a href="/assumptions" className="text-xs flex items-center gap-2 p-2 border rounded-md hover:bg-muted/40 bg-card">
              <span className="font-mono text-[10px] bg-[#D32F2F]/10 px-1.5 py-0.5 rounded">→ /assumptions</span>
              Vue synthétique de toutes les hypothèses
            </a>
          </div>
        </CardContent>
      </Card>

      <Accordion defaultValue={["timeline", "subs", "salaries"]} className="space-y-3">
        <AccordionItem value="timeline" className="border rounded-lg bg-card border-[#D32F2F]/30">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="text-left">
              <div className="font-semibold">Timeline du projet</div>
              <div className="text-xs text-muted-foreground font-normal">
                Année de démarrage + horizon en années
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Année de démarrage (Sept N)</Label>
                <select
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-sm mt-1.5"
                  value={params.timeline.startYear}
                  onChange={(e) => {
                    const y = parseInt(e.target.value);
                    setParams((p) => ({ ...p, timeline: { ...p.timeline, startYear: y } }));
                  }}
                >
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>
                      Sept {y} (FY{y % 100})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">Premier mois du modèle</p>
              </div>
              <div>
                <Label className="text-xs">Horizon (années)</Label>
                <select
                  className="h-9 w-full rounded-md border bg-transparent px-3 text-sm mt-1.5"
                  value={params.timeline.horizonYears}
                  onChange={(e) => {
                    const n = parseInt(e.target.value);
                    setParams((p) => {
                      // Resize growthRates and rent.monthlyByFy
                      const oldGrowths = p.subs.growthRates ?? [];
                      const newGrowths = [...oldGrowths];
                      while (newGrowths.length < n - 1) newGrowths.push(newGrowths[newGrowths.length - 1] ?? 0.10);
                      newGrowths.length = Math.max(0, n - 1);
                      const oldRent = p.rent.monthlyByFy ?? [];
                      const newRent = [...oldRent];
                      while (newRent.length < n) newRent.push(newRent[newRent.length - 1] ?? 12500);
                      newRent.length = n;
                      return {
                        ...p,
                        timeline: { ...p.timeline, horizonYears: n },
                        subs: { ...p.subs, growthRates: newGrowths },
                        rent: { ...p.rent, monthlyByFy: newRent },
                      };
                    });
                  }}
                >
                  {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} ans
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">FY{params.timeline.startYear % 100} → FY{(params.timeline.startYear + params.timeline.horizonYears - 1) % 100}</p>
              </div>
              <div className="bg-muted/30 rounded-md p-3 text-xs">
                <div className="text-muted-foreground">Période modélisée</div>
                <div className="font-semibold mt-1">
                  Sept {params.timeline.startYear} → Août {params.timeline.startYear + params.timeline.horizonYears}
                </div>
                <div className="text-muted-foreground mt-1">
                  {params.timeline.horizonYears * 12} mois de projection
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <SectionHeader
          title="Recettes"
          description="Sources de revenus du business plan"
          color="green"
        />

        <AccordionItem value="subs" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="text-left">
              <div className="font-semibold">Nouveaux abonnements</div>
              <div className="text-xs text-muted-foreground font-normal">
                Tarifs, mix produit, ramp-up et croissance
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Tiers d&apos;abonnement</h4>
                <span className={"text-xs " + (Math.abs(totalMix - 1) < 0.001 ? "text-emerald-600" : "text-red-600")}>
                  Total mix: {fmtPct(totalMix)}
                </span>
              </div>
              <div className="space-y-3">
                {params.subs.tiers.map((tier, idx) => {
                  const vatDivisor = 1 + (params.subs.vatRate ?? 0);
                  const priceHT = tier.monthlyPrice / vatDivisor;
                  const fallbackChurn = params.subs.monthlyChurnPct ?? 0;
                  const tierChurn = tier.monthlyChurnPct ?? fallbackChurn;
                  const tierChurnDefined = tier.monthlyChurnPct !== undefined;
                  // Si retentionCurve actif, l'espérance est l'intégrale de la courbe.
                  // Sinon, 1/churn (formule fermée loi géométrique).
                  const curve = params.subs.cohortModel?.retentionCurve;
                  const retentionMonths =
                    curve && curve.length > 0
                      ? expectedRetentionMonths(tierChurn, curve)
                      : tierChurn > 0
                      ? 1 / tierChurn
                      : null;
                  return (
                    <div key={tier.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-3 border rounded-md bg-muted/30">
                      <div className="md:col-span-3">
                        <Label className="text-xs">Nom</Label>
                        <Input
                          value={tier.name}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              subs: {
                                ...p.subs,
                                tiers: p.subs.tiers.map((t, i) => (i === idx ? { ...t, name: e.target.value } : t)),
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-xs">Prix TTC (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={tier.monthlyPrice}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              subs: {
                                ...p.subs,
                                tiers: p.subs.tiers.map((t, i) =>
                                  i === idx ? { ...t, monthlyPrice: parseFloat(e.target.value) || 0 } : t
                                ),
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="md:col-span-1">
                        <Label className="text-xs text-muted-foreground">HT</Label>
                        <div className="h-9 px-2 flex items-center rounded-md border bg-muted/40 text-xs font-mono">
                          {priceHT.toFixed(2)}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-xs">Mix (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={tier.mixPct * 100}
                          onChange={(e) =>
                            setParams((p) => ({
                              ...p,
                              subs: {
                                ...p.subs,
                                tiers: p.subs.tiers.map((t, i) =>
                                  i === idx ? { ...t, mixPct: (parseFloat(e.target.value) || 0) / 100 } : t
                                ),
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="md:col-span-3">
                        {/* Churn par tier : 2 états visuels distincts pour éviter la
                            confusion historique (le champ semblait modifier le global).
                            - Sans override : badge read-only "Hérite global X%" + bouton "Override".
                              Aucun input visible → impossible de croire qu'on édite le global.
                            - Avec override : input rouge éditable + × pour reset au global. */}
                        <Label className="text-xs">Churn / mois</Label>
                        {!tierChurnDefined ? (
                          <div className="flex items-center gap-2 mt-1">
                            <div
                              className="flex-1 h-9 px-3 rounded-md border bg-muted/30 text-xs flex items-center font-mono text-muted-foreground"
                              title={`Hérite du churn global. Source : section Saisonnalité & rétention.`}
                            >
                              {(tierChurn * 100).toFixed(2)}% <span className="ml-1 text-[10px]">(hérité global)</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 px-2 text-[10px]"
                              title="Définir un churn différent pour ce tier (override). Le global reste appliqué aux autres tiers."
                              onClick={() =>
                                setParams((p) => ({
                                  ...p,
                                  subs: {
                                    ...p.subs,
                                    tiers: p.subs.tiers.map((t, i) =>
                                      i === idx ? { ...t, monthlyChurnPct: tierChurn } : t
                                    ),
                                  },
                                }))
                              }
                            >
                              + Override
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="relative flex-1">
                              <Input
                                type="number"
                                step="0.1"
                                value={(tierChurn * 100).toFixed(2)}
                                onChange={(e) =>
                                  setParams((p) => ({
                                    ...p,
                                    subs: {
                                      ...p.subs,
                                      tiers: p.subs.tiers.map((t, i) =>
                                        i === idx ? { ...t, monthlyChurnPct: (parseFloat(e.target.value) || 0) / 100 } : t
                                      ),
                                    },
                                  }))
                                }
                                className="pr-7 border-[#D32F2F]/50 bg-[#D32F2F]/5"
                                title={`Override tier actif (différent du global ${(fallbackChurn * 100).toFixed(2)}%). Rétention ~${retentionMonths ? retentionMonths.toFixed(0) : "∞"} mois.`}
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                %
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 px-2 text-[10px]"
                              title="Retirer override, retomber sur churn global"
                              onClick={() =>
                                setParams((p) => ({
                                  ...p,
                                  subs: {
                                    ...p.subs,
                                    tiers: p.subs.tiers.map((t, i) => {
                                      if (i !== idx) return t;
                                      const { monthlyChurnPct: _drop, ...rest } = t;
                                      return rest;
                                    }),
                                  },
                                }))
                              }
                            >
                              ×
                            </Button>
                          </div>
                        )}
                        {retentionMonths ? (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Rétention ~{retentionMonths.toFixed(0)} mois
                            {tierChurnDefined ? " (override actif)" : ""}
                          </p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground mt-0.5">Pas de churn</p>
                        )}
                      </div>
                      <div className="md:col-span-1 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() =>
                            setParams((p) => ({
                              ...p,
                              subs: { ...p.subs, tiers: p.subs.tiers.filter((_, i) => i !== idx) },
                            }))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Niveau 6 — Mix évolutif par FY (override mixPct statique).
                          Permet de modéliser un mix qui glisse vers le premium au fil
                          des FY (ex : 30% → 45% sur 5 ans). Désactivé = mix constant. */}
                      <div className="md:col-span-12 mt-1 border-t pt-2">
                        <details>
                          <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground select-none">
                            Mix évolutif par FY {tier.mixPctByFy ? "(actif)" : "(constant — clique pour activer)"}
                          </summary>
                          <div className="mt-2 space-y-1.5">
                            <p className="text-[10px] text-muted-foreground">
                              Si défini, override le mix statique. Le moteur interpole linéairement entre les
                              valeurs FY pour produire un mix mensuel. Veille à ce que la somme des mix par FY
                              reste cohérente (la validation est faite au niveau du tableau ci-dessus).
                            </p>
                            <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-7 gap-1">
                              {Array.from({ length: params.timeline.horizonYears }, (_, fyIdx) => {
                                const fyLabel = `FY${(params.timeline.startYear + fyIdx) % 100}`;
                                const arr = tier.mixPctByFy ?? [];
                                const value = arr[fyIdx] ?? tier.mixPct;
                                return (
                                  <div key={fyIdx}>
                                    <Label className="text-[9px] text-muted-foreground">{fyLabel}</Label>
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        step="1"
                                        value={(value * 100).toFixed(1).replace(/\.0$/, "")}
                                        onChange={(e) => {
                                          const v = (parseFloat(e.target.value) || 0) / 100;
                                          setParams((p) => ({
                                            ...p,
                                            subs: {
                                              ...p.subs,
                                              tiers: p.subs.tiers.map((t, i) => {
                                                if (i !== idx) return t;
                                                const base =
                                                  t.mixPctByFy ??
                                                  new Array(p.timeline.horizonYears).fill(t.mixPct);
                                                const next = [...base];
                                                while (next.length < p.timeline.horizonYears) next.push(t.mixPct);
                                                next[fyIdx] = v;
                                                return { ...t, mixPctByFy: next };
                                              }),
                                            },
                                          }));
                                        }}
                                        className="h-7 px-1 text-[10px] pr-5"
                                      />
                                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">
                                        %
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                              {tier.mixPctByFy ? (
                                <div className="flex items-end">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-[9px]"
                                    onClick={() =>
                                      setParams((p) => ({
                                        ...p,
                                        subs: {
                                          ...p.subs,
                                          tiers: p.subs.tiers.map((t, i) => {
                                            if (i !== idx) return t;
                                            const { mixPctByFy: _drop, ...rest } = t;
                                            return rest;
                                          }),
                                        },
                                      }))
                                    }
                                    title="Retirer override, retomber sur mixPct statique"
                                  >
                                    × Reset
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </details>
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
                      subs: {
                        ...p.subs,
                        tiers: [
                          ...p.subs.tiers,
                          {
                            id: `tier_${Date.now()}`,
                            name: "Nouveau tier",
                            monthlyPrice: 100,
                            mixPct: 0,
                          },
                        ],
                      },
                    }))
                  }
                >
                  <Plus className="h-4 w-4 mr-1" /> Ajouter un tier
                </Button>
              </div>
            </div>

            <SubsEvolutionEditor params={params} setParams={setParams} patch={patch} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="legacy" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="text-left">
              <div className="font-semibold">Abonnement legacy (Javelot)</div>
              <div className="text-xs text-muted-foreground font-normal">
                Migration anciens membres + churn
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ParamNumber path="legacy.startCount" label="Membres au Sept 2025" value={params.legacy.startCount} />
              <ParamNumber path="legacy.avgMonthlyPrice" label="Prix mensuel moyen" value={params.legacy.avgMonthlyPrice} unit="€" step={1} />
              <ParamNumber path="legacy.yearlyChurnAbs" label="Churn / an (membres)" value={params.legacy.yearlyChurnAbs} hint="Linéaire mois par mois (utilisé si pas de cohortes)" />
            </div>

            <LegacyCohortsEditor params={params} setParams={setParams} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
              <div>
                <Label className="text-xs">Migration legacy → nouveaux abos / mois (%)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    value={((params.legacy.monthlyMigrationPct ?? 0) * 100).toFixed(2)}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        legacy: {
                          ...p.legacy,
                          monthlyMigrationPct: (parseFloat(e.target.value) || 0) / 100,
                        },
                      }))
                    }
                    className="pr-7"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    %
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Membre migré sort de legacy + crédité comme acquisition new (sans CAC).
                </p>
              </div>
              <div>
                <Label className="text-xs">Tier cible migration (optionnel)</Label>
                <select
                  className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                  value={params.legacy.migrationTargetTierId ?? ""}
                  onChange={(e) =>
                    setParams((p) => ({
                      ...p,
                      legacy: {
                        ...p.legacy,
                        migrationTargetTierId: e.target.value || undefined,
                      },
                    }))
                  }
                >
                  <option value="">Distribué selon mix global</option>
                  {params.subs.tiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="prest" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="text-left">
              <div className="font-semibold">Prestations complémentaires</div>
              <div className="text-xs text-muted-foreground font-normal">Teen, sénior, hors abo</div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">CrossFit Teen</h4>
              <div className="grid grid-cols-3 gap-3">
                <ParamNumber path="prestations.teen.price" label="Prix mensuel" value={params.prestations.teen.price} unit="€" />
                <ParamNumber path="prestations.teen.startCount" label="Nb au Sept 25" value={params.prestations.teen.startCount} />
                <ParamNumber path="prestations.teen.growthPa" label="Croissance / an" value={params.prestations.teen.growthPa} unit="%" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">CrossFit Sénior</h4>
              <div className="grid grid-cols-3 gap-3">
                <ParamNumber path="prestations.senior.price" label="Prix mensuel" value={params.prestations.senior.price} unit="€" />
                <ParamNumber path="prestations.senior.startCount" label="Nb au Sept 25" value={params.prestations.senior.startCount} />
                <ParamNumber path="prestations.senior.growthPa" label="Croissance / an" value={params.prestations.senior.growthPa} unit="%" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">Hors abo (FAC, kiné, locations)</h4>
              <div className="grid grid-cols-2 gap-3">
                <ParamNumber path="prestations.horsAbo.monthlyAvg" label="CA mensuel moyen" value={params.prestations.horsAbo.monthlyAvg} unit="€" />
                <ParamNumber path="prestations.horsAbo.growthPa" label="Croissance / an" value={params.prestations.horsAbo.growthPa} unit="%" />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="merch" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="font-semibold text-left">Merchandising</div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="grid grid-cols-2 gap-3">
              <ParamNumber path="merch.monthlyMargin" label="Marge mensuelle" value={params.merch.monthlyMargin} unit="€" />
              <ParamNumber path="merch.growthPa" label="Croissance / an" value={params.merch.growthPa} unit="%" />
            </div>
          </AccordionContent>
        </AccordionItem>

        <SectionHeader
          title="Charges"
          description="Coûts opérationnels — salaires, locaux, fournisseurs"
          color="red"
        />

        <AccordionItem value="salaries" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="text-left">
              <div className="font-semibold">Masse salariale</div>
              <div className="text-xs text-muted-foreground font-normal">
                Édité dans la section dédiée
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="p-3 border rounded-md bg-muted/20">
                <div className="text-xs text-muted-foreground">Cadres salariés</div>
                <div className="text-lg font-bold">{params.salaries.items.length}</div>
                <div className="text-[10px] text-muted-foreground">
                  Total FTE: {params.salaries.items.reduce((s, x) => s + x.fte, 0).toFixed(1)}
                </div>
              </div>
              <div className="p-3 border rounded-md bg-muted/20">
                <div className="text-xs text-muted-foreground">Pools freelance</div>
                <div className="text-lg font-bold">
                  {(params.salaries.freelancePools ?? []).length}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Coût net: {fmtCurrency((params.salaries.freelancePools ?? []).reduce((s, pool) => {
                    const h = pool.hoursPerWeekday !== undefined && pool.hoursPerWeekendDay !== undefined
                      ? (pool.hoursPerWeekday * 5 + pool.hoursPerWeekendDay * 2) * 4.3
                      : pool.monthlyHours;
                    return s + pool.hourlyRate * h;
                  }, 0))}/mo
                </div>
              </div>
              <div className="p-3 border rounded-md bg-muted/20">
                <div className="text-xs text-muted-foreground">Indexation annuelle</div>
                <div className="text-lg font-bold">
                  {fmtPct(params.salaries.annualIndexPa)}
                </div>
                <div className="text-[10px] text-muted-foreground">Globale</div>
              </div>
            </div>
            <a
              href="/salaries"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#D32F2F] hover:underline"
            >
              Ouvrir l&apos;outil Masse salariale →
            </a>
            <p className="text-xs text-muted-foreground">
              Édition complète des cadres, freelances, taux de charges et estimateur dans la
              page dédiée <span className="font-mono">/salaries</span>.
            </p>
          </AccordionContent>
        </AccordionItem>


        <AccordionItem value="rent" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="font-semibold text-left">Location & charges immobilières</div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-4">
            <div>
              <Label className="text-xs font-medium">Loyer mensuel par année (€)</Label>
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 mt-1.5">
                {params.rent.monthlyByFy.map((v, i) => {
                  const fyLabel = `FY${(params.timeline.startYear + i) % 100}`;
                  return (
                    <ValidatedCell
                      key={i}
                      path={`rent.monthlyByFy.${i}`}
                      value={v}
                      label={fyLabel}
                      compact
                    >
                      <Input
                        type="number"
                        value={v}
                        onChange={(e) =>
                          setParams((p) => ({
                            ...p,
                            rent: {
                              ...p.rent,
                              monthlyByFy: p.rent.monthlyByFy.map((x, j) =>
                                j === i ? parseFloat(e.target.value) || 0 : x
                              ),
                            },
                          }))
                        }
                      />
                    </ValidatedCell>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <ParamNumber path="rent.yearlyTaxes" label="Taxes annuelles (Foncière, CET, ...)" value={params.rent.yearlyTaxes} unit="€" />
              <ParamNumber path="rent.monthlyCoopro" label="Charges copropriété mensuelles" value={params.rent.monthlyCoopro} unit="€" />
              <ParamNumber
                path="rent.franchiseMonths"
                label="Franchise loyer (mois)"
                value={params.rent.franchiseMonths ?? 0}
                unit="mois"
                hint="Loyer offert sur N premiers mois (charges copro + taxes restent dues)"
              />
            </div>
            {(params.rent.franchiseMonths ?? 0) > 0 && (
              <div className="rounded border border-emerald-300 bg-emerald-50/30 p-2 text-xs text-emerald-900">
                💡 Économie franchise : <b>{(params.rent.franchiseMonths ?? 0)} × {(params.rent.monthlyByFy[0] ?? 0).toLocaleString("fr-FR")}€ = {((params.rent.franchiseMonths ?? 0) * (params.rent.monthlyByFy[0] ?? 0)).toLocaleString("fr-FR")}€</b> de loyer économisés au démarrage. Charges copro et taxes restent dues.
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="recurring" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="font-semibold text-left">Charges récurrentes mensuelles</div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-2">
              {params.recurring.map((it, idx) => (
                <div key={it.id} className="grid grid-cols-12 gap-2 items-end p-2 border rounded">
                  <div className="col-span-5">
                    <Label className="text-xs">Poste</Label>
                    <Input
                      value={it.name}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          recurring: p.recurring.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)),
                        }))
                      }
                    />
                  </div>
                  <div className="col-span-3">
                    <ValidatedCell
                      path={`recurring.${idx}.monthly`}
                      value={it.monthly}
                      label={`${it.name} — Mensuel (€)`}
                      compact
                    >
                      <Input
                        type="number"
                        value={it.monthly}
                        onChange={(e) =>
                          setParams((p) => ({
                            ...p,
                            recurring: p.recurring.map((r, i) =>
                              i === idx ? { ...r, monthly: parseFloat(e.target.value) || 0 } : r
                            ),
                          }))
                        }
                      />
                    </ValidatedCell>
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Catégorie</Label>
                    <select
                      className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                      value={it.category}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          recurring: p.recurring.map((r, i) =>
                            i === idx ? { ...r, category: e.target.value as typeof r.category } : r
                          ),
                        }))
                      }
                    >
                      <option value="entretien">Entretien</option>
                      <option value="frais_op">Frais op</option>
                      <option value="marketing">Marketing</option>
                      <option value="provision">Provision</option>
                    </select>
                  </div>
                  <div className="col-span-1 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() =>
                        setParams((p) => ({ ...p, recurring: p.recurring.filter((_, i) => i !== idx) }))
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
                    recurring: [
                      ...p.recurring,
                      { id: `r_${Date.now()}`, name: "Nouveau poste", monthly: 0, category: "frais_op" },
                    ],
                  }))
                }
              >
                <Plus className="h-4 w-4 mr-1" /> Ajouter
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="marketing" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="font-semibold text-left">Marketing & commercial</div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="grid grid-cols-3 gap-3">
              <ParamNumber path="marketing.monthlyBudget" label="Budget mensuel fixe" value={params.marketing.monthlyBudget} unit="€" />
              <ParamNumber path="marketing.indexPa" label="Indexation / an" value={params.marketing.indexPa} unit="%" />
              <ParamNumber
                path="marketing.pctOfRevenue"
                label="% du CA additionnel"
                value={params.marketing.pctOfRevenue}
                unit="%"
                step={0.5}
                hint="Marketing variable scalé sur CA"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="provisions" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="font-semibold text-left">Provisions</div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="grid grid-cols-3 gap-3">
              <ParamNumber path="provisions.monthlyEquipement" label="Petit équipement / mois" value={params.provisions.monthlyEquipement} unit="€" />
              <ParamNumber path="provisions.monthlyTravaux" label="Travaux / mois" value={params.provisions.monthlyTravaux} unit="€" />
              <ParamNumber path="provisions.indexPa" label="Indexation / an" value={params.provisions.indexPa} unit="%" />
            </div>
          </AccordionContent>
        </AccordionItem>

        <SectionHeader
          title="Investissement & Financement"
          description="CAPEX initial + apports/emprunts/obligations"
          color="blue"
        />

        <AccordionItem value="capex" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="font-semibold text-left">CAPEX & investissement initial</div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-4">
            {!params.capexItems && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ParamNumber path="capex.equipment" label="Équipement" value={params.capex.equipment} unit="€" />
                  <ParamNumber path="capex.travaux" label="Travaux" value={params.capex.travaux} unit="€" />
                  <ParamNumber path="capex.juridique" label="Juridique" value={params.capex.juridique} unit="€" />
                  <ParamNumber path="capex.depots" label="Dépôts garantie" value={params.capex.depots} unit="€" />
                </div>
                <div className="text-xs text-muted-foreground">
                  Total CAPEX:{" "}
                  <span className="font-semibold text-foreground">
                    {fmtCurrency(
                      params.capex.equipment + params.capex.travaux + params.capex.juridique + params.capex.depots
                    )}
                  </span>
                </div>
              </>
            )}
            <CapexItemsEditor />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="financing" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="text-left">
              <div className="font-semibold">Financement</div>
              <div className="text-xs text-muted-foreground font-normal">
                Édition complète sur la page <span className="font-mono">/financing</span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Apport / emprunts / obligations sont édités sur la page dédiée Financement, qui inclut
                le simulateur d&apos;échéancier.
              </p>
              <ul className="text-xs list-disc pl-5 space-y-1">
                <li>{(params.financing.equity ?? []).length} ligne(s) d&apos;apport / equity</li>
                <li>{(params.financing.loans ?? []).length} emprunt(s) bancaire(s)</li>
                <li>{(params.financing.bonds ?? []).length} émission(s) obligataire(s)</li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        <SectionHeader
          title="Fiscalité"
          description="Impôt sur les sociétés, amortissements, BFR"
          color="amber"
        />

        <AccordionItem value="tax" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="font-semibold text-left">Fiscalité & comptabilité</div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-4">
            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <Label className="text-sm font-medium">Activer Impôt sur les Sociétés (IS)</Label>
                <p className="text-xs text-muted-foreground">Calcule taxe sur PBT positif</p>
              </div>
              <Switch
                checked={params.tax.enableIs}
                onCheckedChange={(v) => patch("tax.enableIs", v)}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <Label className="text-sm font-medium">Activer Dotations aux Amortissements (D&A)</Label>
                <p className="text-xs text-muted-foreground">Linéaire sur durée définie</p>
              </div>
              <Switch
                checked={params.tax.enableDA}
                onCheckedChange={(v) => patch("tax.enableDA", v)}
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ParamNumber path="tax.isRate" label="Taux IS" value={params.tax.isRate} unit="%" step={0.5} />
              <ParamNumber
                path="tax.amortYearsEquipment"
                label="Amort. équipement (années)"
                value={params.tax.amortYearsEquipment ?? 5}
                hint={`CAPEX équipement: ${params.capex.equipment.toLocaleString("fr-FR")}€`}
              />
              <ParamNumber
                path="tax.amortYearsTravaux"
                label="Amort. travaux (années)"
                value={params.tax.amortYearsTravaux ?? 10}
                hint={`CAPEX travaux: ${params.capex.travaux.toLocaleString("fr-FR")}€`}
              />
              <ParamNumber path="bfr.daysOfRevenue" label="BFR net (jours de CA)" value={params.bfr.daysOfRevenue} />
            </div>

            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <Label className="text-sm font-medium">Reprise déficits fiscaux (carry-forward)</Label>
                <p className="text-xs text-muted-foreground">
                  Reporte les pertes des FY antérieurs sur les FY rentables (réduit la base imposable).
                </p>
              </div>
              <Switch
                checked={params.tax.enableLossCarryForward !== false}
                onCheckedChange={(v) => patch("tax.enableLossCarryForward", v)}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <Label className="text-sm font-medium">Échéancier IS trimestriel</Label>
                <p className="text-xs text-muted-foreground">
                  Décaissement par 4 acomptes (mois 2/5/8/11 du FY) au lieu d&apos;un lissage mensuel.
                  N&apos;affecte que la trésorerie, pas la charge comptable.
                </p>
              </div>
              <Switch
                checked={params.tax.isPaymentSchedule === "quarterly"}
                onCheckedChange={(v) => patch("tax.isPaymentSchedule", v ? "quarterly" : "monthly")}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <Label className="text-sm font-medium">Modéliser flux TVA</Label>
                <p className="text-xs text-muted-foreground">
                  TVA collectée sur ventes (TTC) - déductible sur achats (HT). Versement trimestriel.
                  N&apos;affecte que la trésorerie (P&amp;L conservé en TTC).
                </p>
              </div>
              <Switch
                checked={params.tax.enableVat === true}
                onCheckedChange={(v) => patch("tax.enableVat", v)}
              />
            </div>
            {params.tax.enableVat && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 border rounded bg-muted/20">
                <ParamNumber
                  path="tax.vatRate"
                  label="Taux TVA"
                  value={params.tax.vatRate ?? params.subs.vatRate ?? 0.20}
                  unit="%"
                  step={0.5}
                />
                <ParamNumber
                  path="tax.vatDeductibleOpexPct"
                  label="% OPEX assujetti TVA"
                  value={params.tax.vatDeductibleOpexPct ?? 0.5}
                  unit="%"
                  step={5}
                  hint="Salaires exclus automatiquement"
                />
              </div>
            )}

            <div className="p-3 border rounded space-y-3">
              <div>
                <Label className="text-sm font-medium">BFR détaillé (optionnel)</Label>
                <p className="text-xs text-muted-foreground">
                  Si renseignés, surcharge le BFR net en jours = créances - fournisseurs + stock.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <ParamNumber
                  path="bfr.daysReceivables"
                  label="Créances clients (j)"
                  value={params.bfr.daysReceivables ?? 0}
                  hint="Square: ~3j typique"
                />
                <ParamNumber
                  path="bfr.daysSupplierPayables"
                  label="Dettes fournisseurs (j)"
                  value={params.bfr.daysSupplierPayables ?? 0}
                  hint="30j typique B2B"
                />
                <ParamNumber
                  path="bfr.daysStock"
                  label="Stock (j)"
                  value={params.bfr.daysStock ?? 0}
                  hint="0 en service pur"
                />
              </div>
              {(params.bfr.daysReceivables !== undefined ||
                params.bfr.daysSupplierPayables !== undefined ||
                params.bfr.daysStock !== undefined) && (
                <p className="text-xs text-muted-foreground">
                  BFR net effectif:{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {Math.max(
                      0,
                      (params.bfr.daysReceivables ?? 0) -
                        (params.bfr.daysSupplierPayables ?? 0) +
                        (params.bfr.daysStock ?? 0)
                    )}
                  </span>{" "}
                  jours (override sur BFR jours de CA simple).
                </p>
              )}
            </div>
            {(() => {
              const items = expandCapex(params);
              const monthly = params.tax.enableDA
                ? items.reduce(
                    (s, it) =>
                      s + (it.amortYears > 0 ? it.amount / Math.max(1, it.amortYears * 12) : 0),
                    0
                  )
                : 0;
              const annual = monthly * 12;
              const nonAmort = items
                .filter((it) => it.amortYears <= 0)
                .reduce((s, it) => s + it.amount, 0);
              return (
                <div className="text-xs text-muted-foreground p-3 border rounded bg-muted/20">
                  D&A mensuelle estimée:{" "}
                  <span className="font-mono font-semibold text-foreground">{fmtCurrency(monthly)}</span>{" "}
                  · Annuelle:{" "}
                  <span className="font-mono font-semibold text-foreground">{fmtCurrency(annual)}</span>
                  {nonAmort > 0 && (
                    <>
                      {" "}· Postes non amortissables ({fmtCurrency(nonAmort)}):{" "}
                      {items
                        .filter((it) => it.amortYears <= 0 && it.amount > 0)
                        .map((it) => it.name)
                        .join(", ")}
                      .
                    </>
                  )}
                </div>
              );
            })()}
          </AccordionContent>
        </AccordionItem>

        <SectionHeader
          title="Charges (suite)"
          description="Prestataires ponctuels"
          color="red"
        />

        <AccordionItem value="oneoff" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="font-semibold text-left">Prestataires ponctuels (annuels)</div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-2">
            {params.oneOffs.map((it, idx) => (
              <div key={it.id} className="grid grid-cols-12 gap-2 items-end p-2 border rounded">
                <div className="col-span-5">
                  <Label className="text-xs">Nom</Label>
                  <Input
                    value={it.name}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        oneOffs: p.oneOffs.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)),
                      }))
                    }
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Montant (€)</Label>
                  <Input
                    type="number"
                    value={it.amount}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        oneOffs: p.oneOffs.map((r, i) =>
                          i === idx ? { ...r, amount: parseFloat(e.target.value) || 0 } : r
                        ),
                      }))
                    }
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Mois (0=Sept .. 11=Août)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="11"
                    value={it.month}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        oneOffs: p.oneOffs.map((r, i) =>
                          i === idx ? { ...r, month: parseInt(e.target.value || "0") } : r
                        ),
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
                      setParams((p) => ({ ...p, oneOffs: p.oneOffs.filter((_, i) => i !== idx) }))
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
                  oneOffs: [
                    ...p.oneOffs,
                    { id: `o_${Date.now()}`, name: "Nouveau", amount: 0, month: 0, yearly: true },
                  ],
                }))
              }
            >
              <Plus className="h-4 w-4 mr-1" /> Ajouter
            </Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function LegacyCohortsEditor({
  params,
  setParams,
}: {
  params: ModelParams;
  setParams: (updater: (p: ModelParams) => ModelParams) => void;
}) {
  const cohorts = params.legacy.cohorts ?? [];
  const enabled = cohorts.length > 0;
  const totalCount = cohorts.reduce((s, c) => s + c.startCount, 0);

  const addCohort = () => {
    setParams((p) => ({
      ...p,
      legacy: {
        ...p.legacy,
        cohorts: [
          ...(p.legacy.cohorts ?? []),
          {
            id: `coh_${Date.now()}`,
            name: "Nouvelle cohorte",
            startCount: 50,
            avgMonthlyPrice: p.legacy.avgMonthlyPrice,
            monthlyChurnPct: 0.015,
          },
        ],
      },
    }));
  };

  const removeCohort = (id: string) => {
    setParams((p) => ({
      ...p,
      legacy: {
        ...p.legacy,
        cohorts: (p.legacy.cohorts ?? []).filter((c) => c.id !== id),
      },
    }));
  };

  const updateCohort = (id: string, patch: Partial<LegacyCohort>) => {
    setParams((p) => ({
      ...p,
      legacy: {
        ...p.legacy,
        cohorts: (p.legacy.cohorts ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
      },
    }));
  };

  const seedDefault = () => {
    setParams((p) => ({
      ...p,
      legacy: {
        ...p.legacy,
        cohorts: [
          { id: `coh_long_${Date.now()}`, name: "2020-2022 long-stay", startCount: 80, avgMonthlyPrice: 130, monthlyChurnPct: 0.005 },
          { id: `coh_mid_${Date.now() + 1}`, name: "2023-2024 mid", startCount: 100, avgMonthlyPrice: 120, monthlyChurnPct: 0.015 },
          { id: `coh_recent_${Date.now() + 2}`, name: "2025 récents", startCount: 40, avgMonthlyPrice: 115, monthlyChurnPct: 0.025 },
        ],
      },
    }));
  };

  return (
    <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-3 bg-muted/5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h5 className="text-xs font-semibold uppercase tracking-wider">
            Cohortes legacy multi-vintage (Niveau 4)
          </h5>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Modélise différents groupes de membres legacy avec churn différencié.
            Override les 3 champs ci-dessus.
            {enabled ? (
              <span className="ml-1 text-foreground">
                Total : <strong>{totalCount}</strong> membres ({cohorts.length} cohortes)
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!enabled ? (
            <>
              <Button variant="ghost" size="sm" onClick={seedDefault} className="text-xs h-7">
                Preset 3 cohortes
              </Button>
              <Button variant="outline" size="sm" onClick={addCohort} className="text-xs h-7">
                <Plus className="h-3 w-3 mr-1" /> Ajouter
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={addCohort} className="text-xs h-7">
              <Plus className="h-3 w-3 mr-1" /> Ajouter cohorte
            </Button>
          )}
        </div>
      </div>

      {enabled ? (
        <div className="space-y-2">
          {cohorts.map((c) => {
            const retention = c.monthlyChurnPct > 0 ? 1 / c.monthlyChurnPct : null;
            return (
              <div
                key={c.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-2 border rounded-md bg-background"
              >
                <div className="md:col-span-4">
                  <Label className="text-[10px]">Nom</Label>
                  <Input
                    value={c.name}
                    onChange={(e) => updateCohort(c.id, { name: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px]">Effectif M0</Label>
                  <Input
                    type="number"
                    step="1"
                    value={c.startCount}
                    onChange={(e) =>
                      updateCohort(c.id, { startCount: parseFloat(e.target.value) || 0 })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px]">Prix mensuel</Label>
                  <Input
                    type="number"
                    step="1"
                    value={c.avgMonthlyPrice}
                    onChange={(e) =>
                      updateCohort(c.id, { avgMonthlyPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="md:col-span-3">
                  <Label className="text-[10px]">
                    Churn / mo (rétention {retention ? `~${retention.toFixed(0)} mo` : "∞"})
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      value={(c.monthlyChurnPct * 100).toFixed(2)}
                      onChange={(e) =>
                        updateCohort(c.id, {
                          monthlyChurnPct: (parseFloat(e.target.value) || 0) / 100,
                        })
                      }
                      className="h-8 text-xs pr-6"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
                <div className="md:col-span-1 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 h-8"
                    onClick={() => removeCohort(c.id)}
                    title="Supprimer cohorte"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground italic">
          Aucune cohorte définie. Mode legacy linéaire (yearlyChurnAbs) actif.
        </p>
      )}
    </div>
  );
}
