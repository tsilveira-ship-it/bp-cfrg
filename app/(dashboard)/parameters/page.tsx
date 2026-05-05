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
import { Trash2, Plus } from "lucide-react";
import { fmtPct, fmtCurrency } from "@/lib/format";

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
            Tous les inputs du modèle. Modifications appliquées en temps réel et persistées localement.
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <Accordion defaultValue={["subs", "salaries"]} className="space-y-3">
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
                {params.subs.tiers.map((tier, idx) => (
                  <div key={tier.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-3 border rounded-md bg-muted/30">
                    <div className="md:col-span-4">
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
                    <div className="md:col-span-3">
                      <Label className="text-xs">Prix mensuel (€)</Label>
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
                    <div className="md:col-span-3">
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
                    <div className="md:col-span-2">
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
                  </div>
                ))}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ParamNumber
                path="subs.rampStartCount"
                label="Nouveaux abos Sept 2025"
                value={params.subs.rampStartCount}
              />
              <ParamNumber
                path="subs.rampEndCount"
                label="Nouveaux abos Août 2026"
                value={params.subs.rampEndCount}
                hint="Cible fin FY25, ramp linéaire"
              />
              <ParamNumber
                path="subs.priceIndexPa"
                label="Indexation tarifs / an"
                value={params.subs.priceIndexPa}
                unit="%"
                step={0.5}
                hint="Hausse annuelle composée"
              />
              <ParamNumber path="subs.fy26GrowthPct" label="Croissance FY26" value={params.subs.fy26GrowthPct} unit="%" step={1} />
              <ParamNumber path="subs.fy27GrowthPct" label="Croissance FY27" value={params.subs.fy27GrowthPct} unit="%" step={1} />
              <ParamNumber path="subs.fy28GrowthPct" label="Croissance FY28" value={params.subs.fy28GrowthPct} unit="%" step={1} />
              <ParamNumber path="subs.fy29GrowthPct" label="Croissance FY29" value={params.subs.fy29GrowthPct} unit="%" step={1} />
            </div>
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
          <AccordionContent className="px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ParamNumber path="legacy.startCount" label="Membres au Sept 2025" value={params.legacy.startCount} />
              <ParamNumber path="legacy.avgMonthlyPrice" label="Prix mensuel moyen" value={params.legacy.avgMonthlyPrice} unit="€" step={1} />
              <ParamNumber path="legacy.yearlyChurnAbs" label="Churn / an (membres)" value={params.legacy.yearlyChurnAbs} hint="Linéaire mois par mois" />
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

        <AccordionItem value="salaries" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="text-left">
              <div className="font-semibold">Masse salariale</div>
              <div className="text-xs text-muted-foreground font-normal">
                Postes, FTEs, bumps FY26 et indexation annuelle
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <ParamNumber
                path="salaries.annualIndexPa"
                label="Indexation annuelle"
                value={params.salaries.annualIndexPa}
                unit="%"
                step={0.5}
                hint="Appliquée à partir de FY26"
              />
              <ParamNumber
                path="salaries.chargesPatroPct"
                label="Charges patronales additionnelles"
                value={params.salaries.chargesPatroPct}
                unit="%"
                hint="0 si déjà incluses dans brut"
              />
            </div>
            <div className="space-y-2">
              {params.salaries.items.map((it, idx) => (
                <div key={it.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-3 border rounded-md bg-muted/30">
                  <div className="md:col-span-3">
                    <Label className="text-xs">Rôle</Label>
                    <Input
                      value={it.role}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          salaries: {
                            ...p.salaries,
                            items: p.salaries.items.map((s, i) => (i === idx ? { ...s, role: e.target.value } : s)),
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Salaire FY25 (mensuel)</Label>
                    <Input
                      type="number"
                      value={it.monthlyGross}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          salaries: {
                            ...p.salaries,
                            items: p.salaries.items.map((s, i) =>
                              i === idx ? { ...s, monthlyGross: parseFloat(e.target.value) || 0 } : s
                            ),
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Salaire FY26 (override)</Label>
                    <Input
                      type="number"
                      value={it.fy26Bump ?? ""}
                      placeholder="—"
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          salaries: {
                            ...p.salaries,
                            items: p.salaries.items.map((s, i) =>
                              i === idx
                                ? {
                                    ...s,
                                    fy26Bump: e.target.value === "" ? undefined : parseFloat(e.target.value) || 0,
                                  }
                                : s
                            ),
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Label className="text-xs">FTE</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={it.fte}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          salaries: {
                            ...p.salaries,
                            items: p.salaries.items.map((s, i) =>
                              i === idx ? { ...s, fte: parseFloat(e.target.value) || 0 } : s
                            ),
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Démarre au mois</Label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={it.startMonth}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          salaries: {
                            ...p.salaries,
                            items: p.salaries.items.map((s, i) =>
                              i === idx ? { ...s, startMonth: parseInt(e.target.value || "0") } : s
                            ),
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="md:col-span-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() =>
                        setParams((p) => ({
                          ...p,
                          salaries: {
                            ...p.salaries,
                            items: p.salaries.items.filter((_, i) => i !== idx),
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
                    salaries: {
                      ...p.salaries,
                      items: [
                        ...p.salaries.items,
                        { id: `s_${Date.now()}`, role: "Nouveau poste", monthlyGross: 3000, fte: 1, startMonth: 0 },
                      ],
                    },
                  }))
                }
              >
                <Plus className="h-4 w-4 mr-1" /> Ajouter un poste
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="rent" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="font-semibold text-left">Location & charges immobilières</div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 space-y-4">
            <div>
              <Label className="text-xs font-medium">Loyer mensuel par année (€)</Label>
              <div className="grid grid-cols-5 gap-2 mt-1.5">
                {params.rent.monthlyByFy.map((v, i) => (
                  <div key={i}>
                    <Label className="text-[10px] text-muted-foreground">FY{25 + i}</Label>
                    <Input
                      type="number"
                      value={v}
                      onChange={(e) =>
                        setParams((p) => ({
                          ...p,
                          rent: {
                            ...p.rent,
                            monthlyByFy: p.rent.monthlyByFy.map((x, j) => (j === i ? parseFloat(e.target.value) || 0 : x)),
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ParamNumber path="rent.yearlyTaxes" label="Taxes annuelles (Foncière, CET, ...)" value={params.rent.yearlyTaxes} unit="€" />
              <ParamNumber path="rent.monthlyCoopro" label="Charges copropriété mensuelles" value={params.rent.monthlyCoopro} unit="€" />
            </div>
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
                    <Label className="text-xs">Mensuel (€)</Label>
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

        <AccordionItem value="capex" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="font-semibold text-left">CAPEX & investissement initial</div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ParamNumber path="capex.equipment" label="Équipement" value={params.capex.equipment} unit="€" />
              <ParamNumber path="capex.travaux" label="Travaux" value={params.capex.travaux} unit="€" />
              <ParamNumber path="capex.juridique" label="Juridique" value={params.capex.juridique} unit="€" />
              <ParamNumber path="capex.depots" label="Dépôts garantie" value={params.capex.depots} unit="€" />
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Total CAPEX:{" "}
              <span className="font-semibold text-foreground">
                {fmtCurrency(
                  params.capex.equipment + params.capex.travaux + params.capex.juridique + params.capex.depots
                )}
              </span>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="financing" className="border rounded-lg bg-card">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="font-semibold text-left">Financement (levée, emprunt, obligations)</div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ParamNumber path="financing.fundraise" label="Levée de fonds (M0)" value={params.financing.fundraise} unit="€" />
              <ParamNumber path="financing.loanMonthly" label="Mensualité emprunt" value={params.financing.loanMonthly} unit="€" />
              <ParamNumber path="financing.loanDurationMonths" label="Durée emprunt" value={params.financing.loanDurationMonths} unit="mois" />
              <ParamNumber path="financing.bondMonthly" label="Coupon obligation / mois" value={params.financing.bondMonthly} unit="€" />
              <ParamNumber path="financing.bondCapitalRepayMonthly" label="Remb. capital obligation" value={params.financing.bondCapitalRepayMonthly} unit="€" />
              <ParamNumber path="financing.bondDurationMonths" label="Durée obligation" value={params.financing.bondDurationMonths} unit="mois" />
            </div>
          </AccordionContent>
        </AccordionItem>

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
            <div className="grid grid-cols-3 gap-3">
              <ParamNumber path="tax.isRate" label="Taux IS" value={params.tax.isRate} unit="%" step={0.5} />
              <ParamNumber path="tax.daYears" label="Durée amortissement" value={params.tax.daYears} unit="mois" hint="En années" />
              <ParamNumber path="bfr.daysOfRevenue" label="BFR (jours de CA)" value={params.bfr.daysOfRevenue} hint="Décalage encaissements/décaissements" />
            </div>
          </AccordionContent>
        </AccordionItem>

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
