"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  title: string;
  value: string;
  subValue?: string;
  trend?: number;
  intent?: "default" | "positive" | "negative" | "warning";
  icon?: ReactNode;
};

export function KpiCard({ title, value, subValue, trend, intent = "default", icon }: Props) {
  const intentClass = {
    default: "",
    positive: "text-emerald-600",
    negative: "text-red-600",
    warning: "text-amber-600",
  }[intent];

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground/70">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold tracking-tight", intentClass)}>{value}</div>
        {subValue && <div className="text-xs text-muted-foreground mt-1">{subValue}</div>}
        {trend !== undefined && (
          <div
            className={cn(
              "text-xs mt-1 font-medium",
              trend >= 0 ? "text-emerald-600" : "text-red-600"
            )}
          >
            {trend >= 0 ? "▲" : "▼"} {(trend * 100).toFixed(1)}%
          </div>
        )}
      </CardContent>
    </Card>
  );
}
