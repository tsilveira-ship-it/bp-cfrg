"use client";
import { useModelStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { buildTimeline } from "@/lib/model/types";

type Props = {
  value: number;
  onChange: (n: number) => void;
  label?: string;
};

export function StartMonthPicker({ value, onChange, label = "Démarre au mois" }: Props) {
  const params = useModelStore((s) => s.params);
  const tl = buildTimeline(params.timeline.startYear, params.timeline.horizonYears);
  const monthLabel = tl.monthLabels[value] ?? "—";

  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min="0"
          max={tl.horizonMonths - 1}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value || "0"))}
          className="w-20"
        />
        <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
          = {monthLabel}
        </span>
      </div>
      <div className="flex flex-wrap gap-1 mt-1">
        {Array.from({ length: tl.horizonYears }, (_, fy) => fy * 12).map((m, fy) => (
          <Button
            key={m}
            type="button"
            variant={value === m ? "default" : "outline"}
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => onChange(m)}
          >
            {tl.fyLabels[fy]}
          </Button>
        ))}
      </div>
    </div>
  );
}
