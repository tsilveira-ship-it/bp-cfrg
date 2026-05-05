"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Coins,
  TrendingUp,
  Wallet,
  Sliders,
  ShieldAlert,
  CalendarRange,
  FolderOpen,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/user-menu";

const NAV = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/revenue", label: "Recettes", icon: TrendingUp },
  { href: "/costs", label: "Dépenses", icon: Coins },
  { href: "/cashflow", label: "Trésorerie", icon: Wallet },
  { href: "/monthly", label: "Vue mensuelle", icon: CalendarRange },
  { href: "/parameters", label: "Paramètres", icon: Sliders },
  { href: "/scenarios", label: "Mes scénarios", icon: FolderOpen },
  { href: "/audit", label: "Audit & risques", icon: ShieldAlert },
];

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="px-6 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-md bg-white flex items-center justify-center p-1.5">
            <Image
              src="/logo-rg.svg"
              alt="CrossFit Rive Gauche"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>
          <div>
            <div className="font-heading font-bold tracking-wide text-sm leading-tight uppercase">
              CrossFit Rive Gauche
            </div>
            <div className="text-[10px] text-sidebar-foreground/60 mt-0.5">
              Business Plan FY25–FY29
            </div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {[...NAV, ...(isAdmin ? [{ href: "/admin", label: "Administration", icon: ShieldCheck }] : [])].map((it) => {
          const Icon = it.icon;
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
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
      <div className="border-t border-sidebar-border py-3">
        <UserMenu />
      </div>
      <div className="px-4 pb-3 text-[10px] text-sidebar-foreground/40">
        v260505 — Prévi_gestion
      </div>
    </aside>
  );
}
