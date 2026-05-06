import type { FieldValidation, ModelParams } from "./model/types";

export type ValidationStatus = "none" | "level1" | "level1-stale" | "validated" | "validated-stale";

/** Détermine l'état de validation d'un champ selon sa valeur actuelle. */
export function getValidationStatus(
  validation: FieldValidation | undefined,
  currentValue: unknown
): ValidationStatus {
  if (!validation) return "none";
  const l1 = validation.level1;
  const l2 = validation.level2;
  if (!l1) return "none";
  const l1Valid = sameValue(l1.value, currentValue);
  if (!l2) return l1Valid ? "level1" : "level1-stale";
  const l2Valid = sameValue(l2.value, currentValue);
  if (l1Valid && l2Valid) return "validated";
  return "validated-stale";
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-9;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Statistiques globales de validation pour le scénario. */
export type ValidationSummary = {
  total: number;
  validated: number;
  partial: number;     // level1 only
  stale: number;       // valeur changée depuis validation
  none: number;
};

/** Résumé des validations parmi un set de paths à surveiller. */
export function summarizeValidations(
  params: ModelParams,
  paths: string[],
  getValue: (path: string) => unknown
): ValidationSummary {
  const out: ValidationSummary = { total: paths.length, validated: 0, partial: 0, stale: 0, none: 0 };
  for (const p of paths) {
    const v = params.fieldValidations?.[p];
    const status = getValidationStatus(v, getValue(p));
    if (status === "validated") out.validated++;
    else if (status === "level1") out.partial++;
    else if (status === "level1-stale" || status === "validated-stale") out.stale++;
    else out.none++;
  }
  return out;
}

/** Récupère une valeur depuis params via path "subs.tiers.0.monthlyPrice". */
export function getValueAtPath(params: ModelParams, path: string): unknown {
  const keys = path.split(/[.[\]]/).filter(Boolean);
  let cur: unknown = params;
  for (const k of keys) {
    if (cur === null || cur === undefined) return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}
