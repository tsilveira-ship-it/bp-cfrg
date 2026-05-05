"use client";
import { ChevronRight } from "lucide-react";

type Props = {
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

/** Bouton libellé+chevron utilisé dans la première cellule d'une ligne pliable. */
export function CollapseToggle({ open, onToggle, children }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="inline-flex items-center gap-1.5 -ml-1 px-1 py-0.5 rounded hover:bg-muted/60 cursor-pointer text-left"
    >
      <ChevronRight
        className={
          "h-3.5 w-3.5 text-muted-foreground transition-transform " + (open ? "rotate-90" : "")
        }
      />
      <span>{children}</span>
    </button>
  );
}

type ExpandAllProps = {
  allExpanded: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
};

export function ExpandAllButton({ allExpanded, onExpandAll, onCollapseAll }: ExpandAllProps) {
  return (
    <button
      type="button"
      onClick={allExpanded ? onCollapseAll : onExpandAll}
      className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline cursor-pointer"
    >
      {allExpanded ? "Tout replier" : "Tout déplier"}
    </button>
  );
}
