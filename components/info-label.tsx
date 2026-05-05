"use client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getAnalysis } from "@/lib/analyses";
import { Info } from "lucide-react";

type Props = {
  label: string;
  override?: string;
  className?: string;
};

// Petit label avec icône info au survol — pour KPI cards manuels.
export function InfoLabel({ label, override, className }: Props) {
  const explanation = override ?? getAnalysis(label);
  return (
    <span className={"inline-flex items-center gap-1 " + (className ?? "")}>
      {label}
      {explanation && (
        <TooltipProvider delay={200}>
          <Tooltip>
            <TooltipTrigger render={<span className="cursor-help inline-flex" />}>
              <Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs leading-relaxed normal-case font-normal">
              {explanation}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </span>
  );
}
