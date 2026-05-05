"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { exportFullScenario } from "@/lib/excel-export";
import { Button } from "@/components/ui/button";

type Variant = "outline" | "default" | "ghost";

export function ExcelExportButton({
  label = "Exporter Excel",
  variant = "outline",
  size = "sm",
}: {
  label?: string;
  variant?: Variant;
  size?: "default" | "xs" | "sm" | "lg";
}) {
  const params = useModelStore((s) => s.params);
  const loaded = useModelStore((s) => s.loaded);
  const [pending, setPending] = useState(false);

  const onClick = () => {
    setPending(true);
    // setTimeout pour laisser l'UI updater le label
    setTimeout(() => {
      try {
        const result = computeModel(params);
        const scen =
          loaded.kind === "fork" || loaded.kind === "master"
            ? loaded.name.replace(/[^a-z0-9-]/gi, "_").slice(0, 30)
            : "current";
        exportFullScenario(params, result, scen);
      } finally {
        setPending(false);
      }
    }, 50);
  };

  return (
    <Button onClick={onClick} variant={variant} size={size} disabled={pending}>
      <Download className="h-3.5 w-3.5" />
      {pending ? "Génération..." : label}
    </Button>
  );
}
