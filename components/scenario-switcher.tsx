"use client";
import { useModelStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function ScenarioSwitcher() {
  const scenario = useModelStore((s) => s.scenario);
  const apply = useModelStore((s) => s.applyScenario);
  const reset = useModelStore((s) => s.reset);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground mr-1">Scénario:</span>
      <Button
        variant={scenario === "base" ? "default" : "outline"}
        size="sm"
        onClick={() => apply("base")}
      >
        Base (xlsx)
      </Button>
      <Button
        variant={scenario === "audit" ? "default" : "outline"}
        size="sm"
        onClick={() => apply("audit")}
      >
        Audit corrigé
      </Button>
      {scenario === "custom" && (
        <Badge variant="secondary" className="ml-1">
          Personnalisé
        </Badge>
      )}
      <Button variant="ghost" size="sm" onClick={reset} className="ml-2">
        Reset
      </Button>
    </div>
  );
}
