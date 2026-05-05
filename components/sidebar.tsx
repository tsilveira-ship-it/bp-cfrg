"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Coins,
  TrendingUp,
  Wallet,
  Sliders,
  ShieldAlert,
  CalendarRange,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/revenue", label: "Recettes", icon: TrendingUp },
  { href: "/costs", label: "Dépenses", icon: Coins },
  { href: "/cashflow", label: "Trésorerie", icon: Wallet },
  { href: "/monthly", label: "Vue mensuelle", icon: CalendarRange },
  { href: "/parameters", label: "Paramètres", icon: Sliders },
  { href: "/audit", label: "Audit & risques", icon: ShieldAlert },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="px-6 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-[#84171d] flex items-center justify-center text-white font-black text-lg">
            RG
          </div>
          <div>
            <div className="font-semibold tracking-tight text-sm leading-tight">
              CrossFit Rive Gauche
            </div>
            <div className="text-xs text-muted-foreground">Business Plan FY25–FY29</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((it) => {
          const Icon = it.icon;
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 text-[10px] text-sidebar-foreground/60 border-t border-sidebar-border">
        v260505 — données chargées depuis Prévi_gestion
      </div>
    </aside>
  );
}
