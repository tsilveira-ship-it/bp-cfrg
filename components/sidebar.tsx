"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
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
  Banknote,
  UsersRound,
  FileSpreadsheet,
  TrendingDown,
  Briefcase,
  ListChecks,
  Scale,
  Activity,
  History,
  Send,
  FileJson,
  HeartPulse,
  Waves,
  GitCompareArrows,
  Dices,
  CalendarDays,
  PieChart,
  Sparkles,
  GitBranch,
  BookOpen,
  Globe,
  MessageSquareText,
  FileText,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/user-menu";

type Item = { href: string; label: string; icon: typeof BarChart3 };
type Group = {
  title: string;
  items: Item[];
  collapsibleByDefault?: boolean;
};

const GROUPS: Group[] = [
  {
    title: "Pilotage",
    items: [
      { href: "/", label: "Dashboard", icon: BarChart3 },
      { href: "/pnl", label: "Compte de résultat", icon: FileSpreadsheet },
      { href: "/cashflow", label: "Trésorerie", icon: Wallet },
      { href: "/balance-sheet", label: "Bilan", icon: Scale },
      { href: "/monthly", label: "Vue mensuelle", icon: CalendarRange },
      { href: "/plan-quinzaines", label: "Plan an1 (quinzaines)", icon: CalendarDays },
    ],
  },
  {
    title: "Modélisation",
    items: [
      { href: "/parameters", label: "Paramètres", icon: Sliders },
      { href: "/revenue", label: "Recettes", icon: TrendingUp },
      { href: "/costs", label: "Dépenses", icon: Coins },
      { href: "/salaries", label: "Masse salariale", icon: UsersRound },
      { href: "/capacity-planner", label: "Capacity planner", icon: CalendarDays },
      { href: "/financing", label: "Financement", icon: Banknote },
    ],
  },
  {
    title: "Diagnostic",
    items: [
      { href: "/audit-pack", label: "Audit pack", icon: ShieldCheck },
      { href: "/health-check", label: "Health check", icon: HeartPulse },
      { href: "/cross-checks", label: "Cross-checks", icon: ShieldCheck },
      { href: "/audit", label: "Audit & risques", icon: ShieldAlert },
    ],
  },
  {
    title: "Sensibilité",
    items: [
      { href: "/sensitivity", label: "Sensibilité ±", icon: TrendingDown },
      { href: "/monte-carlo", label: "Monte Carlo", icon: Dices },
      { href: "/waterfalls", label: "Waterfall charts", icon: Waves },
      { href: "/variance", label: "Variance (réel/prévu)", icon: GitCompareArrows },
    ],
  },
  {
    title: "Pitch & partage",
    items: [
      { href: "/executive-summary", label: "Executive summary", icon: Sparkles },
      { href: "/financial-highlights", label: "Synthèse 1-page", icon: Sparkles },
      { href: "/use-of-funds", label: "Use of funds", icon: GitBranch },
      { href: "/cap-table", label: "Cap table", icon: PieChart },
      { href: "/share", label: "Partager (lien investisseur)", icon: Send },
      { href: "/full-bp", label: "BP complet (PDF)", icon: FileText },
    ],
  },
  {
    title: "Scénarios",
    items: [
      { href: "/assumptions", label: "Hypothèses", icon: ListChecks },
      { href: "/scenarios", label: "Mes scénarios", icon: FolderOpen },
    ],
  },
  {
    title: "Outils avancés",
    collapsibleByDefault: true,
    items: [
      { href: "/investor", label: "Investisseur (legacy)", icon: Briefcase },
      { href: "/capacity", label: "Capacité (vue rapide)", icon: Activity },
      { href: "/audit-log", label: "Audit log", icon: History },
      { href: "/qa", label: "Q&A par champ", icon: MessageSquareText },
      { href: "/comparables", label: "Comparables marché", icon: Globe },
      { href: "/glossary", label: "Glossaire", icon: BookOpen },
      { href: "/master-history", label: "Historique masters", icon: History },
      { href: "/data-room", label: "Data room", icon: FolderOpen },
      { href: "/backup", label: "Backup JSON", icon: FileJson },
    ],
  },
];

const COLLAPSED_KEY = "bp-sidebar-collapsed";

function readCollapsed(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(COLLAPSED_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  // Persisted collapsed state via useSyncExternalStore
  const collapsed = useSyncExternalStore(
    () => () => {},
    () => readCollapsed(),
    () => ({} as Record<string, boolean>)
  );
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const isCollapsed = (group: Group) => {
    const k = group.title;
    if (k in overrides) return overrides[k];
    if (k in collapsed) return collapsed[k];
    return group.collapsibleByDefault ?? false;
  };
  const toggleCollapse = (k: string) => {
    setOverrides((cur) => {
      const next = { ...cur, [k]: !isCollapsedInternal(k, cur, collapsed, GROUPS) };
      try {
        window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const groups = isAdmin
    ? [
        ...GROUPS,
        {
          title: "Admin",
          items: [{ href: "/admin", label: "Administration", icon: ShieldCheck }],
        },
      ]
    : GROUPS;

  return (
    <aside className="hidden md:flex md:w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="px-6 py-5 border-b border-sidebar-border">
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
            <div className="text-[10px] text-sidebar-foreground/60 mt-0.5">Business Plan</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-2 overflow-y-auto">
        {groups.map((group) => {
          const grp = group as Group;
          const collapsedNow = isCollapsed(grp);
          return (
            <div key={grp.title}>
              <button
                type="button"
                onClick={() => toggleCollapse(grp.title)}
                className="w-full px-3 pt-2 pb-1 flex items-center justify-between text-[9px] uppercase tracking-widest text-sidebar-foreground/40 hover:text-sidebar-foreground/70 font-bold"
              >
                <span>{grp.title}</span>
                <ChevronRight
                  className={cn(
                    "h-3 w-3 transition-transform",
                    !collapsedNow && "rotate-90"
                  )}
                />
              </button>
              {!collapsedNow &&
                grp.items.map((it) => {
                  const Icon = it.icon;
                  const active = pathname === it.href;
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{it.label}</span>
                    </Link>
                  );
                })}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border">
        <UserMenu />
      </div>
    </aside>
  );
}

function isCollapsedInternal(
  k: string,
  overrides: Record<string, boolean>,
  persisted: Record<string, boolean>,
  groups: Group[]
): boolean {
  if (k in overrides) return overrides[k];
  if (k in persisted) return persisted[k];
  const g = groups.find((x) => x.title === k);
  return g?.collapsibleByDefault ?? false;
}
