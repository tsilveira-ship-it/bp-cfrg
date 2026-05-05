"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useModelStore } from "@/lib/store";

type Props = {
  path: string;
  label: string;
  value: number;
  step?: number;
  unit?: "€" | "%" | "n" | "mois";
  hint?: string;
};

export function ParamNumber({ path, label, value, step = 1, unit = "n", hint }: Props) {
  const patch = useModelStore((s) => s.patch);

  const display = unit === "%" ? value * 100 : value;
  const handleChange = (v: number) => {
    const newVal = unit === "%" ? v / 100 : v;
    patch(path, newVal);
  };

  const suffix = unit === "€" ? "€" : unit === "%" ? "%" : unit === "mois" ? "mois" : "";

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          step={step}
          value={Number.isFinite(display) ? display : 0}
          onChange={(e) => handleChange(parseFloat(e.target.value || "0"))}
          className="pr-10"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
