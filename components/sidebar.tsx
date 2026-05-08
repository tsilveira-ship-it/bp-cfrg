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
  Wrench,
  LineChart,
  Users,
  Filter,
  Skull,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/user-menu";

export type Mode = "build" | "analyze" | "all";

type Item = {
  href: string;
  label: string;
  icon: typeof BarChart3;
  // Modes où l'item apparaît. Si non défini, visible uniquement en "all".
  modes?: ("build" | "analyze")[];
  adminOnly?: boolean;
};
type Group = {
  title: string;
  items: Item[];
  collapsibleByDefault?: boolean;
};

const ALL = ["build", "analyze"] as const;

const GROUPS: Group[] = [
  {
    title: "Pilotage",
    items: [
      { href: "/", label: "Dashboard", icon: BarChart3, modes: [...ALL] },
      { href: "/pnl", label: "Compte de résultat", icon: FileSpreadsheet, modes: [...ALL] },
      { href: "/cashflow", label: "Trésorerie", icon: Wallet, modes: [...ALL] },
      { href: "/balance-sheet", label: "Bilan", icon: Scale, modes: [...ALL] },
      { href: "/monthly", label: "Vue mensuelle", icon: CalendarRange, modes: ["build"] },
      { href: "/plan-quinzaines", label: "Plan an1 (quinzaines)", icon: CalendarDays, modes: ["build"] },
    ],
  },
  {
    title: "Modélisation",
    items: [
      { href: "/parameters", label: "Paramètres", icon: Sliders, modes: ["build"] },
      { href: "/revenue", label: "Recettes", icon: TrendingUp, modes: ["build"] },
      { href: "/costs", label: "Dépenses", icon: Coins, modes: ["build"] },
      { href: "/salaries", label: "Masse salariale", icon: UsersRound, modes: ["build"] },
      { href: "/capacity-planner", label: "Capacity planner", icon: CalendarDays, modes: ["build"] },
      { href: "/financing", label: "Financement", icon: Banknote, modes: ["build"] },
    ],
  },
  {
    title: "Diagnostic",
    items: [
      { href: "/audit-pack", label: "Audit pack", icon: ShieldCheck, modes: [...ALL] },
      { href: "/health-check", label: "Health check", icon: HeartPulse, modes: [...ALL] },
      { href: "/cross-checks", label: "Cross-checks", icon: ShieldCheck, modes: ["analyze"] },
      { href: "/audit", label: "Audit & risques", icon: ShieldAlert, modes: [...ALL] },
      { href: "/vc-devil", label: "VC Devil's advocate", icon: Skull, modes: [...ALL], adminOnly: true },
    ],
  },
  {
    title: "Sensibilité",
    items: [
      { href: "/sensitivity", label: "Sensibilité ±", icon: TrendingDown, modes: [...ALL] },
      { href: "/monte-carlo", label: "Monte Carlo", icon: Dices, modes: [...ALL] },
      { href: "/waterfalls", label: "Waterfall charts", icon: Waves, modes: ["analyze"] },
      { href: "/variance", label: "Variance (réel/prévu)", icon: GitCompareArrows, modes: ["build"] },
    ],
  },
  {
    title: "Pitch & partage",
    items: [
      { href: "/executive-summary", label: "Executive summary", icon: Sparkles, modes: [...ALL] },
      { href: "/financial-highlights", label: "Synthèse 1-page", icon: Sparkles, modes: [...ALL] },
      { href: "/team", label: "Équipe", icon: Users, modes: [...ALL] },
      { href: "/funnel", label: "Funnel CRM", icon: Filter, modes: [...ALL] },
      { href: "/use-of-funds", label: "Use of funds", icon: GitBranch, modes: [...ALL] },
      { href: "/cap-table", label: "Cap table", icon: PieChart, modes: [...ALL] },
      { href: "/share", label: "Partager (lien investisseur)", icon: Send, modes: ["build"] },
      { href: "/full-bp", label: "BP complet (PDF)", icon: FileText, modes: [...ALL] },
    ],
  },
  {
    title: "Scénarios",
    items: [
      { href: "/assumptions", label: "Hypothèses", icon: ListChecks, modes: [...ALL] },
      { href: "/scenarios", label: "Mes scénarios", icon: FolderOpen, modes: ["build"] },
    ],
  },
  {
    title: "Outils avancés",
    collapsibleByDefault: true,
    items: [
      { href: "/investor", label: "Investisseur (legacy)", icon: Briefcase, modes: ["analyze"] },
      { href: "/capacity", label: "Capacité (vue rapide)", icon: Activity, modes: [...ALL] },
      { href: "/audit-log", label: "Audit log", icon: History, modes: ["analyze"] },
      { href: "/qa", label: "Q&A par champ", icon: MessageSquareText, modes: [...ALL] },
      { href: "/comparables", label: "Comparables marché", icon: Globe, modes: ["analyze"] },
      { href: "/glossary", label: "Glossaire", icon: BookOpen, modes: ["analyze"] },
      { href: "/master-history", label: "Historique masters", icon: History, modes: ["build"] },
      { href: "/data-room", label: "Data room", icon: FolderOpen, modes: [...ALL] },
      { href: "/backup", label: "Backup JSON", icon: FileJson, modes: ["build"] },
    ],
  },
];

const COLLAPSED_KEY = "bp-sidebar-collapsed";
const MODE_KEY = "bp-sidebar-mode";

// Cache module-level pour stabiliser la référence retournée par useSyncExternalStore
// (sinon getSnapshot retourne un nouveau {} à chaque render → re-render infini).
const EMPTY_COLLAPSED: Record<string, boolean> = Object.freeze({}) as Record<string, boolean>;
let collapsedCache: Record<string, boolean> | null = null;

function readCollapsed(): Record<string, boolean> {
  if (collapsedCache !== null) return collapsedCache;
  if (typeof window === "undefined") return EMPTY_COLLAPSED;
  try {
    const raw = window.localStorage.getItem(COLLAPSED_KEY);
    collapsedCache = raw ? (JSON.parse(raw) as Record<string, boolean>) : EMPTY_COLLAPSED;
  } catch {
    collapsedCache = EMPTY_COLLAPSED;
  }
  return collapsedCache;
}

function readMode(): Mode {
  if (typeof window === "undefined") return "all";
  try {
    const raw = window.localStorage.getItem(MODE_KEY);
    if (raw === "build" || raw === "analyze" || raw === "all") return raw;
  } catch {}
  return "all";
}

function isVisibleInMode(item: Item, mode: Mode): boolean {
  if (mode === "all") return true;
  if (!item.modes) return false; // si non taggué, n'apparait pas dans les modes filtrés
  return item.modes.includes(mode);
}

const MODE_INFO: Record<Exclude<Mode, "all">, { label: string; icon: typeof Wrench; tip: string }> = {
  build: { label: "Construire", icon: Wrench, tip: "Pour le fondateur qui édite et structure le BP" },
  analyze: { label: "Analyser", icon: LineChart, tip: "Pour l'investisseur ou banquier qui audite le BP" },
};

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(
    () => () => {},
    () => readCollapsed(),
    () => EMPTY_COLLAPSED
  );
  const initialMode = useSyncExternalStore(
    () => () => {},
    () => readMode(),
    () => "all" as Mode
  );
  const [mode, setMode] = useState<Mode>(initialMode);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const setModeAndPersist = (m: Mode) => {
    setMode(m);
    try {
      window.localStorage.setItem(MODE_KEY, m);
    } catch {}
  };

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

  const filteredGroups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => isVisibleInMode(it, mode) && (!it.adminOnly || isAdmin)),
  })).filter((g) => g.items.length > 0);

  const groups = isAdmin
    ? [
        ...filteredGroups,
        {
          title: "Admin",
          items: [
            {
              href: "/admin",
              label: "Administration",
              icon: ShieldCheck,
              modes: [...ALL] as ("build" | "analyze")[],
            },
          ],
        } as Group,
      ]
    : filteredGroups;

  return (
    <aside className="hidden md:flex md:w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-md bg-white flex items-center justify-center p-1.5">
            <Image
              src="/logo-rg.svg"
              alt="CrossFit Rive Gauche"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <div>
            <div className="font-heading font-bold tracking-wide text-xs leading-tight uppercase">
              CrossFit Rive Gauche
            </div>
            <div className="text-[10px] text-sidebar-foreground/60 mt-0.5">Business Plan</div>
          </div>
        </div>
      </div>

      {/* Mode picker */}
      <div className="border-b border-sidebar-border p-2">
        <div className="text-[9px] uppercase tracking-widest text-sidebar-foreground/40 font-bold px-2 pb-1">
          Mode
        </div>
        <div className="grid grid-cols-3 gap-1">
          <ModeButton mode="build" current={mode} onSelect={setModeAndPersist} />
          <ModeButton mode="analyze" current={mode} onSelect={setModeAndPersist} />
          <button
            onClick={() => setModeAndPersist("all")}
            className={cn(
              "rounded text-[11px] py-1.5 font-medium transition-colors",
              mode === "all"
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "bg-sidebar-accent/30 hover:bg-sidebar-accent/60"
            )}
            title="Affiche toutes les pages"
          >
            Tout
          </button>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
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
                  className={cn("h-3 w-3 transition-transform", !collapsedNow && "rotate-90")}
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

function ModeButton({
  mode,
  current,
  onSelect,
}: {
  mode: "build" | "analyze";
  current: Mode;
  onSelect: (m: Mode) => void;
}) {
  const info = MODE_INFO[mode];
  const Icon = info.icon;
  const isActive = current === mode;
  return (
    <button
      onClick={() => onSelect(mode)}
      title={info.tip}
      className={cn(
        "flex items-center justify-center gap-1 rounded text-[11px] py-1.5 font-medium transition-colors",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "bg-sidebar-accent/30 hover:bg-sidebar-accent/60"
      )}
    >
      <Icon className="h-3 w-3" />
      {info.label}
    </button>
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
