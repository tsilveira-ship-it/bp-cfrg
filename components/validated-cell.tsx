"use client";
import { useModelStore } from "@/lib/store";
import { getValidationStatus, type ValidationStatus } from "@/lib/validation-status";
import { FieldNote } from "@/components/field-note";
import { FieldValidator } from "@/components/field-validator";
import { Label } from "@/components/ui/label";

type Props = {
  path: string;
  value: unknown;
  label?: string;
  /** Affiche le label en haut. */
  showLabel?: boolean;
  /** Le contenu (input ou cellule). */
  children: React.ReactNode;
  /** Forcer une bordure plus discrète (taille compacte). */
  compact?: boolean;
};

const STATUS_BORDER: Record<ValidationStatus, string> = {
  none: "border-transparent",
  level1: "border-amber-400/70 bg-amber-50/30",
  "level1-stale": "border-orange-400 bg-orange-50/40",
  validated: "border-emerald-400 bg-emerald-50/30",
  "validated-stale": "border-orange-400 bg-orange-50/40",
  flagged: "border-red-500 bg-red-50/50 ring-1 ring-red-300",
};

/**
 * Wrapper qui ajoute note + validator + style de bordure selon le statut de validation
 * autour d'un champ existant. Utilisé pour les éditeurs custom (recurring, rent FY, etc.)
 * qui n'utilisent pas <ParamNumber>.
 */
export function ValidatedCell({
  path,
  value,
  label,
  showLabel = true,
  children,
  compact = false,
}: Props) {
  const validation = useModelStore((s) => s.params.fieldValidations?.[path]);
  const note = useModelStore((s) => s.params.fieldNotes?.[path]);
  const status = getValidationStatus(validation, value);

  return (
    <div
      className={
        "group/field rounded-md border-2 transition-colors " +
        STATUS_BORDER[status] +
        (compact ? " p-1.5" : " p-2")
      }
    >
      {showLabel && label && (
        <div className="flex items-center justify-between gap-1 mb-1">
          <Label className="text-[10px] font-medium text-muted-foreground">{label}</Label>
          <div className="flex items-center gap-0.5">
            <FieldValidator path={path} value={value} label={label} />
            <FieldNote path={path} label={label} />
          </div>
        </div>
      )}
      {children}
      {note && (
        <p className="text-[10px] text-amber-700 italic line-clamp-1 mt-1" title={note.note}>
          📝 {note.note}
        </p>
      )}
      {status === "flagged" && validation?.flagged && (
        <p className="text-[10px] text-red-700 italic mt-1" title={validation.flagged.reason}>
          🚩 À revoir{validation.flagged.reason ? ` — ${validation.flagged.reason}` : ""}
        </p>
      )}
    </div>
  );
}
