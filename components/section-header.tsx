"use client";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  color?: "green" | "red" | "blue" | "amber" | "neutral";
  icon?: ReactNode;
};

const COLOR_BAR = {
  green: "bg-emerald-500",
  red: "bg-[#D32F2F]",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  neutral: "bg-neutral-500",
} as const;

const COLOR_TEXT = {
  green: "text-emerald-700",
  red: "text-[#D32F2F]",
  blue: "text-blue-700",
  amber: "text-amber-700",
  neutral: "text-foreground",
} as const;

export function SectionHeader({ title, description, color = "neutral", icon }: Props) {
  return (
    <div className="flex items-center gap-3 pt-4 pb-1">
      <div className={cn("h-8 w-1 rounded-full", COLOR_BAR[color])} />
      <div className="flex-1">
        <h2 className={cn("font-heading uppercase tracking-wider text-base font-bold", COLOR_TEXT[color])}>
          {title}
        </h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {icon}
    </div>
  );
}
