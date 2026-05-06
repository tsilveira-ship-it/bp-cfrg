"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useModelStore } from "@/lib/store";
import { FieldNote } from "@/components/field-note";
import { FieldValidator } from "@/components/field-validator";

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
  const note = useModelStore((s) => s.params.fieldNotes?.[path]);

  const display = unit === "%" ? value * 100 : value;
  const handleChange = (v: number) => {
    const newVal = unit === "%" ? v / 100 : v;
    patch(path, newVal);
  };

  const suffix = unit === "€" ? "€" : unit === "%" ? "%" : unit === "mois" ? "mois" : "";

  return (
    <div className="group/field space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-medium">{label}</Label>
        <div className="flex items-center gap-0.5">
          <FieldValidator path={path} value={value} label={label} />
          <FieldNote path={path} label={label} />
        </div>
      </div>
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
      {note && (
        <p className="text-[10px] text-amber-700 italic line-clamp-2" title={note.note}>
          📝 {note.note}
        </p>
      )}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
