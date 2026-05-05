"use client";
import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download, FileText, Printer } from "lucide-react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { buildExecutiveSummary } from "@/lib/executive-summary";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScenarioSwitcher } from "@/components/scenario-switcher";

export default function ExecutiveSummaryPage() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);
  const sections = useMemo(() => buildExecutiveSummary(params, result), [params, result]);
  const ref = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const onExportPng = async () => {
    if (!ref.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(ref.current, { backgroundColor: "#ffffff", pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `cfrg-exec-summary-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-7 w-7 text-[#D32F2F]" /> Executive summary
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Memo investisseur 2-pages auto-généré depuis les hypothèses du scénario actif.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onExportPng} variant="outline" disabled={exporting}>
            <Download className="h-4 w-4" />
            {exporting ? "Export..." : "Exporter PNG"}
          </Button>
          <Button onClick={() => window.print()} variant="outline">
            <Printer className="h-4 w-4" />
            Imprimer / PDF
          </Button>
          <ScenarioSwitcher />
        </div>
      </header>

      <div
        ref={ref}
        className="bg-white rounded-md border shadow-sm p-10 max-w-3xl mx-auto print:border-0 print:shadow-none print:p-6"
      >
        <div className="border-b pb-4 mb-6">
          <div className="text-[10px] uppercase tracking-widest text-[#D32F2F] font-bold">
            Executive Summary — Confidentiel
          </div>
          <h2 className="font-heading text-3xl font-bold uppercase tracking-tight mt-1">
            CrossFit Rive Gauche
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Business Plan {result.fyLabels[0]} → {result.fyLabels[result.fyLabels.length - 1]} ·
            Document généré le {new Date().toLocaleDateString("fr-FR")}
          </p>
        </div>

        <div className="space-y-6 leading-relaxed">
          {sections.map((s, i) => (
            <section key={i}>
              <h3 className="font-heading text-base font-bold uppercase tracking-wide text-[#D32F2F] mb-2">
                {i + 1}. {s.title}
              </h3>
              {s.paragraphs.map((p, j) => (
                <p key={j} className="text-sm text-foreground/90 mb-3">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="border-t pt-3 mt-8 text-[10px] text-muted-foreground">
          Document confidentiel destiné aux investisseurs/partenaires bancaires de CFRG. Reproduction
          interdite sans autorisation. Méthodologie open-source: <span className="font-mono">github.com/tsilveira-ship-it/bp-cfrg</span> ·
          Auditer les formules: <span className="font-mono">lib/model/compute.ts</span>.
        </div>
      </div>

      <Card className="bg-muted/30 max-w-3xl mx-auto print:hidden">
        <CardContent className="pt-5">
          <h3 className="font-semibold text-sm mb-2">Comment utiliser</h3>
          <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
            <li>
              <b>Exporter PNG</b>: image haute résolution pour insérer dans deck investisseur.
            </li>
            <li>
              <b>Imprimer / PDF</b>: ouvre la boîte de dialogue d&apos;impression — choisir
              &laquo;&nbsp;Enregistrer en PDF&nbsp;&raquo; pour version officielle.
            </li>
            <li>
              <b>Partager le lien</b>: utiliser <span className="font-mono">/share</span> pour générer un
              lien read-only watermarké.
            </li>
            <li>Le contenu est régénéré automatiquement à chaque modification du scénario.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
