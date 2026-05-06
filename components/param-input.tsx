"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useModelStore } from "@/lib/store";
import { FieldNote } from "@/components/field-note";
import { FieldValidator } from "@/components/field-validator";
import { getValidationStatus, type ValidationStatus } from "@/lib/validation-status";

type Props = {
  path: string;
  label: string;
  value: number;
  step?: number;
  unit?: "€" | "%" | "n" | "mois";
  hint?: string;
};

const STATUS_BG: Record<ValidationStatus, string> = {
  none: "",
  level1: "bg-amber-50/30",
  "level1-stale": "bg-orange-50/40",
  validated: "bg-emerald-50/30",
  "validated-stale": "bg-orange-50/40",
  flagged: "bg-red-50/50 ring-2 ring-red-300",
};

export function ParamNumber({ path, label, value, step = 1, unit = "n", hint }: Props) {
  const patch = useModelStore((s) => s.patch);
  const note = useModelStore((s) => s.params.fieldNotes?.[path]);
  const validation = useModelStore((s) => s.params.fieldValidations?.[path]);
  const status = getValidationStatus(validation, value);

  const display = unit === "%" ? value * 100 : value;
  const handleChange = (v: number) => {
    const newVal = unit === "%" ? v / 100 : v;
    patch(path, newVal);
  };

  const suffix = unit === "€" ? "€" : unit === "%" ? "%" : unit === "mois" ? "mois" : "";
  const wrapBg = STATUS_BG[status];

  return (
    <div className={"group/field space-y-1.5 -mx-1 -my-1 px-1 py-1 rounded-md transition-colors " + wrapBg}>
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
      {status === "flagged" && validation?.flagged && (
        <p className="text-[10px] text-red-700 italic" title={validation.flagged.reason}>
          🚩 À revoir{validation.flagged.reason ? ` — ${validation.flagged.reason}` : ""}
        </p>
      )}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
