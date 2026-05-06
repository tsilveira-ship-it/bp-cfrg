"use client";
import { useEffect, useState } from "react";
import { Check, CheckCheck, Flag, Lock, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useModelStore } from "@/lib/store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getValidationStatus, type ValidationStatus } from "@/lib/validation-status";

type Props = {
  path: string;
  /** Valeur actuelle du champ (pour invalider auto si modifiée). */
  value: unknown;
  /** Label affiché dans le dialog. */
  label?: string;
};

const STATUS_STYLE: Record<
  ValidationStatus,
  { color: string; tip: string; Icon: typeof Check }
> = {
  none: {
    color: "text-muted-foreground/40 hover:text-muted-foreground",
    tip: "Non validé",
    Icon: Check,
  },
  level1: {
    color: "text-amber-500",
    tip: "Validé 1× — il manque une 2e validation par un autre admin",
    Icon: Check,
  },
  "level1-stale": {
    color: "text-orange-500",
    tip: "Valeur modifiée depuis la 1ère validation — à re-valider",
    Icon: RotateCcw,
  },
  validated: {
    color: "text-emerald-600",
    tip: "Doublement validé (4-eyes)",
    Icon: CheckCheck,
  },
  "validated-stale": {
    color: "text-orange-500",
    tip: "Valeur modifiée depuis la double validation — à re-valider",
    Icon: RotateCcw,
  },
  flagged: {
    color: "text-red-600",
    tip: "🚩 Signalé à revoir",
    Icon: Flag,
  },
};

export function FieldValidator({ path, value, label }: Props) {
  const validation = useModelStore((s) => s.params.fieldValidations?.[path]);
  const validateField = useModelStore((s) => s.validateField);
  const unvalidateField = useModelStore((s) => s.unvalidateField);
  const flagField = useModelStore((s) => s.flagField);
  const unflagField = useModelStore((s) => s.unflagField);
  const [open, setOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [flagReason, setFlagReason] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const sb = createSupabaseBrowserClient();
      const { data } = await sb.auth.getUser();
      if (!active) return;
      const email = data.user?.email ?? undefined;
      setAdminEmail(email);
      if (email) {
        const { data: access } = await sb.from("bp_access").select("role").ilike("email", email).maybeSingle();
        if (active) setIsAdmin(access?.role === "admin");
      } else {
        setIsAdmin(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const status = getValidationStatus(validation, value);
  const style = STATUS_STYLE[status];
  const Icon = style.Icon;

  const onValidate = () => {
    if (!adminEmail) return;
    validateField(path, value, adminEmail);
    setOpen(false);
  };
  const onResetL1 = () => {
    unvalidateField(path, 1);
    setOpen(false);
  };
  const onResetL2 = () => {
    unvalidateField(path, 2);
    setOpen(false);
  };
  const onFlag = () => {
    if (!adminEmail) return;
    flagField(path, adminEmail, flagReason);
    setFlagReason("");
    setOpen(false);
  };
  const onUnflag = () => {
    unflagField(path);
    setOpen(false);
  };

  // Boutons contextuels selon état + identité admin
  const canValidate = isAdmin && adminEmail;
  const sameAsL1 = validation?.level1 && validation.level1.admin === adminEmail;
  const sameAsL2 = validation?.level2 && validation.level2.admin === adminEmail;
  const blocked =
    status === "validated" && !sameAsL1 && !sameAsL2; // doublement validé par d'autres = pas d'action possible

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={style.tip}
            title={style.tip}
            className={`inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted transition-colors cursor-pointer ${style.color}`}
          />
        }
      >
        <Icon className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${style.color}`} /> Validation — {label ?? path}
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-mono">{path}</p>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border p-3 bg-muted/20 text-xs space-y-1">
            <div className="font-semibold">État actuel</div>
            <div className="text-foreground">{style.tip}</div>
            {value !== undefined && (
              <div className="text-muted-foreground">
                Valeur affichée:{" "}
                <span className="font-mono">{stringifyValue(value)}</span>
              </div>
            )}
          </div>

          <ValidationLine
            label="Niveau 1"
            stamp={validation?.level1}
            currentValue={value}
            isMine={!!sameAsL1}
            onReset={onResetL1}
            canEdit={!!isAdmin}
          />
          <ValidationLine
            label="Niveau 2 (4-eyes)"
            stamp={validation?.level2}
            currentValue={value}
            isMine={!!sameAsL2}
            onReset={onResetL2}
            canEdit={!!isAdmin}
          />

          {/* Flag "à revoir" */}
          <div
            className={
              "rounded border p-3 text-xs " +
              (validation?.flagged
                ? "border-red-300 bg-red-50/40"
                : "bg-card")
            }
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold flex items-center gap-1">
                <Flag className="h-3.5 w-3.5 text-red-600" /> Signalement &laquo;&nbsp;à revoir&nbsp;&raquo;
              </span>
              {validation?.flagged ? (
                <span className="text-red-700">🚩 Signalé</span>
              ) : (
                <span className="text-muted-foreground italic">Non signalé</span>
              )}
            </div>
            {validation?.flagged ? (
              <div className="mt-1 text-[11px] space-y-0.5">
                <div>
                  Par <b>{validation.flagged.by}</b>
                </div>
                <div>Le {new Date(validation.flagged.date).toLocaleString("fr-FR")}</div>
                {validation.flagged.reason && (
                  <div className="italic">&laquo;&nbsp;{validation.flagged.reason}&nbsp;&raquo;</div>
                )}
                {adminEmail && (
                  <Button variant="ghost" size="xs" onClick={onUnflag} className="mt-1">
                    <Flag className="h-3 w-3" /> Retirer le signalement
                  </Button>
                )}
              </div>
            ) : (
              adminEmail && (
                <div className="space-y-1 mt-1">
                  <input
                    placeholder="Raison (optionnelle): ex 'à confirmer avec le bailleur'"
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    className="w-full text-[11px] rounded border bg-transparent px-2 py-1"
                  />
                  <Button variant="outline" size="xs" onClick={onFlag} className="text-red-600 border-red-300">
                    <Flag className="h-3 w-3" /> Signaler à revoir
                  </Button>
                </div>
              )
            )}
          </div>

          {!isAdmin && !adminEmail && (
            <div className="rounded border border-amber-300 bg-amber-50/40 p-3 text-xs text-amber-800 flex items-start gap-2">
              <Lock className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Connecte-toi pour valider ou signaler des champs.
              </span>
            </div>
          )}
          {isAdmin === false && adminEmail && (
            <div className="rounded border border-blue-300 bg-blue-50/40 p-3 text-xs text-blue-800 flex items-start gap-2">
              <Lock className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Seuls les admins peuvent valider (4-eyes), mais tu peux signaler un champ
                &laquo;&nbsp;à revoir&nbsp;&raquo;.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row! justify-between!">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fermer
          </Button>
          {canValidate && !blocked && (
            <Button onClick={onValidate}>
              <Check className="h-3.5 w-3.5" />
              {!validation?.level1
                ? "Valider (niveau 1)"
                : sameAsL1
                  ? "Re-valider niveau 1"
                  : !validation.level2
                    ? "Co-valider (niveau 2)"
                    : sameAsL2
                      ? "Re-valider niveau 2"
                      : "Valider"}
            </Button>
          )}
          {blocked && (
            <span className="text-xs text-muted-foreground italic">
              Doublement validé par d&apos;autres admins — tu ne peux pas modifier l&apos;état.
            </span>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ValidationLine({
  label,
  stamp,
  currentValue,
  isMine,
  onReset,
  canEdit,
}: {
  label: string;
  stamp: { admin: string; date: string; value: unknown } | undefined;
  currentValue: unknown;
  isMine: boolean;
  onReset: () => void;
  canEdit: boolean;
}) {
  const isStale = stamp && JSON.stringify(stamp.value) !== JSON.stringify(currentValue);
  return (
    <div className="rounded border p-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{label}</span>
        {!stamp ? (
          <span className="text-muted-foreground italic">Non validé</span>
        ) : isStale ? (
          <span className="text-orange-700 italic">⚠️ Valeur changée — re-validation requise</span>
        ) : (
          <span className="text-emerald-700">✓ Valide</span>
        )}
      </div>
      {stamp && (
        <div className="mt-1 text-[11px] text-muted-foreground space-y-0.5">
          <div>
            Par <b className="text-foreground">{stamp.admin}</b>
            {isMine && (
              <span className="ml-1 text-[9px] uppercase tracking-widest text-blue-600">(toi)</span>
            )}
          </div>
          <div>Le {new Date(stamp.date).toLocaleString("fr-FR")}</div>
          <div>
            Valeur figée:{" "}
            <span className="font-mono">{stringifyValue(stamp.value)}</span>
            {isStale && (
              <>
                {" → maintenant "}
                <span className="font-mono text-orange-700">{stringifyValue(currentValue)}</span>
              </>
            )}
          </div>
          {canEdit && (
            <Button variant="ghost" size="xs" onClick={onReset} className="mt-1">
              <RotateCcw className="h-3 w-3" /> Retirer
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function stringifyValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "✓" : "✗";
  if (typeof v === "number") return v.toString();
  if (typeof v === "string") return v;
  return JSON.stringify(v).slice(0, 60);
}
