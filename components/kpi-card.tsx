"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getAnalysis } from "@/lib/analyses";
import { Info } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  value: string;
  subValue?: string;
  trend?: number;
  intent?: "default" | "positive" | "negative" | "warning";
  icon?: ReactNode;
  analysis?: string;
};

export function KpiCard({ title, value, subValue, trend, intent = "default", icon, analysis }: Props) {
  const intentClass = {
    default: "",
    positive: "text-emerald-600",
    negative: "text-red-600",
    warning: "text-amber-600",
  }[intent];

  const explanation = analysis ?? getAnalysis(title);

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          {title}
          {explanation && (
            <TooltipProvider delay={200}>
              <Tooltip>
                <TooltipTrigger render={<span className="cursor-help" />}>
                  <Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs leading-relaxed normal-case font-normal">
                  {explanation}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
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
