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
  Banknote,
  UsersRound,
  FileSpreadsheet,
  TrendingDown,
  Briefcase,
  ListChecks,
  Scale,
  Activity,
  Printer,
  History,
  HeartPulse,
  Waves,
  GitCompareArrows,
  Dices,
  CalendarDays,
  FileJson,
  Send,
  PieChart,
  Sparkles,
  GitBranch,
  BookOpen,
  Globe,
  MessageSquareText,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/user-menu";

type Item = { href: string; label: string; icon: typeof BarChart3 };
type Group = { title: string; items: Item[] };

const GROUPS: Group[] = [
  {
    title: "Vue d'ensemble",
    items: [
      { href: "/", label: "Dashboard", icon: BarChart3 },
      { href: "/pnl", label: "Compte de résultat", icon: FileSpreadsheet },
      { href: "/cashflow", label: "Trésorerie", icon: Wallet },
      { href: "/plan-quinzaines", label: "Plan an1 (quinzaines)", icon: CalendarDays },
      { href: "/balance-sheet", label: "Bilan", icon: Scale },
      { href: "/monthly", label: "Vue mensuelle", icon: CalendarRange },
    ],
  },
  {
    title: "Détail",
    items: [
      { href: "/revenue", label: "Recettes", icon: TrendingUp },
      { href: "/costs", label: "Dépenses", icon: Coins },
      { href: "/salaries", label: "Masse salariale", icon: UsersRound },
      { href: "/financing", label: "Financement", icon: Banknote },
    ],
  },
  {
    title: "Analyse",
    items: [
      { href: "/investor", label: "Investisseur", icon: Briefcase },
      { href: "/cap-table", label: "Cap table", icon: PieChart },
      { href: "/executive-summary", label: "Executive summary", icon: Sparkles },
      { href: "/financial-highlights", label: "Synthèse 1-page", icon: Sparkles },
      { href: "/use-of-funds", label: "Use of funds", icon: GitBranch },
      { href: "/comparables", label: "Comparables marché", icon: Globe },
      { href: "/glossary", label: "Glossaire", icon: BookOpen },
      { href: "/sensitivity", label: "Sensibilité", icon: TrendingDown },
      { href: "/waterfalls", label: "Waterfall charts", icon: Waves },
      { href: "/capacity", label: "Capacité", icon: Activity },
      { href: "/capacity-planner", label: "Capacity planner", icon: CalendarDays },
      { href: "/audit", label: "Audit & risques", icon: ShieldAlert },
      { href: "/audit-pack", label: "Audit pack", icon: ShieldCheck },
      { href: "/health-check", label: "Health check", icon: HeartPulse },
      { href: "/cross-checks", label: "Cross-checks", icon: ShieldCheck },
      { href: "/audit-log", label: "Audit log", icon: History },
      { href: "/qa", label: "Q&A par champ", icon: MessageSquareText },
      { href: "/variance", label: "Variance (réel/prévu)", icon: GitCompareArrows },
      { href: "/monte-carlo", label: "Monte Carlo", icon: Dices },
    ],
  },
  {
    title: "Configuration",
    items: [
      { href: "/parameters", label: "Paramètres", icon: Sliders },
      { href: "/assumptions", label: "Hypothèses", icon: ListChecks },
      { href: "/scenarios", label: "Mes scénarios", icon: FolderOpen },
      { href: "/master-history", label: "Historique masters", icon: History },
      { href: "/share", label: "Partager (lien investisseur)", icon: Send },
      { href: "/data-room", label: "Data room", icon: FolderOpen },
      { href: "/full-bp", label: "BP complet (PDF)", icon: FileText },
      { href: "/backup", label: "Backup JSON", icon: FileJson },
      { href: "/print", label: "Export PDF", icon: Printer },
    ],
  },
];

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
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
              Business Plan
            </div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-3 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.title}>
            <div className="px-3 pt-2 pb-1 text-[9px] uppercase tracking-widest text-sidebar-foreground/40 font-bold">
              {group.title}
            </div>
            {group.items.map((it) => {
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
          </div>
        ))}
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
