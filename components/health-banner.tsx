"use client";
import { useMemo } from "react";
import Link from "next/link";
import { AlertCircle, X } from "lucide-react";
import { useModelStore } from "@/lib/store";
import { computeModel } from "@/lib/model/compute";
import { runHealthCheck } from "@/lib/health-check";

/**
 * Bandeau persistant affiché en haut de chaque page si au moins 1 alerte critique.
 * Cliquer sur le badge → /health-check.
 */
export function HealthBanner() {
  const params = useModelStore((s) => s.params);
  const result = useMemo(() => computeModel(params), [params]);
  const issues = useMemo(() => runHealthCheck(params, result), [params, result]);
  const criticals = issues.filter((i) => i.severity === "critical");

  if (criticals.length === 0) return null;

  return (
    <div className="bg-red-600 text-white">
      <div className="px-6 py-2 flex items-center gap-3 text-sm">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          <span className="font-semibold">{criticals.length} alerte{criticals.length > 1 ? "s" : ""} critique{criticals.length > 1 ? "s" : ""}</span>{" "}
          — {criticals[0].title}
          {criticals.length > 1 && ` (+${criticals.length - 1} autre${criticals.length > 2 ? "s" : ""})`}
        </span>
        <Link
          href="/health-check"
          className="rounded-md bg-white/15 hover:bg-white/25 px-3 py-1 text-xs font-medium transition-colors"
        >
          Voir le diagnostic →
        </Link>
      </div>
    </div>
  );
}
