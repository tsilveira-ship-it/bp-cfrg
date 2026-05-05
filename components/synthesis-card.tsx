"use client";
import { useMemo } from "react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { generateSynthesis } from "@/lib/synthesis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export function SynthesisCard() {
  const params = useModelStore((s) => s.params);
  const loaded = useModelStore((s) => s.loaded);
  const result = useMemo(() => computeModel(params), [params]);
  const text = generateSynthesis(result, params);

  const tag =
    loaded.kind === "master"
      ? `Master v${loaded.version} — ${loaded.name}`
      : loaded.kind === "fork"
      ? `Fork: ${loaded.name}`
      : "Scénario local";

  return (
    <Card className="bg-gradient-to-br from-[#D32F2F]/5 to-[#1a1a1a]/5 border-[#D32F2F]/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#D32F2F]" />
          Synthèse — {tag}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed">{text}</p>
      </CardContent>
    </Card>
  );
}
