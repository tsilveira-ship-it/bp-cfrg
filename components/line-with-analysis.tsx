"use client";
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
  label: string;
  children?: ReactNode;
  override?: string; // explication custom override
  hideIcon?: boolean;
};

export function LineWithAnalysis({ label, children, override, hideIcon }: Props) {
  const explanation = override ?? getAnalysis(label);
  if (!explanation) return <>{children ?? label}</>;

  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger
          render={<span className="inline-flex items-center gap-1 cursor-help border-b border-dotted border-muted-foreground/40" />}
        >
          {children ?? label}
          {!hideIcon && <Info className="h-3 w-3 text-muted-foreground/60" />}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs leading-relaxed">
          {explanation}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
