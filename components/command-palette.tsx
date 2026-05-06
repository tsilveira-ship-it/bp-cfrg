"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Banknote,
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  Coins,
  Dices,
  FileJson,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  GitBranch,
  GitCompareArrows,
  Globe,
  HeartPulse,
  History,
  ListChecks,
  MessageSquareText,
  PieChart,
  Scale,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UsersRound,
  Wallet,
  Waves,
} from "lucide-react";

type Cmd = {
  href: string;
  label: string;
  keywords: string;
  icon: typeof BarChart3;
  group: string;
};

const COMMANDS: Cmd[] = [
  // Pilotage
  { href: "/", label: "Dashboard", icon: BarChart3, group: "Pilotage", keywords: "dashboard accueil home kpis" },
  { href: "/pnl", label: "Compte de résultat", icon: FileSpreadsheet, group: "Pilotage", keywords: "p&l pnl income statement opex ebitda" },
  { href: "/cashflow", label: "Trésorerie", icon: Wallet, group: "Pilotage", keywords: "tresorerie cash cfo cfi cff" },
  { href: "/balance-sheet", label: "Bilan", icon: Scale, group: "Pilotage", keywords: "bilan actif passif" },
  { href: "/monthly", label: "Vue mensuelle", icon: CalendarRange, group: "Pilotage", keywords: "monthly mensuel" },
  { href: "/plan-quinzaines", label: "Plan an1 (quinzaines)", icon: CalendarDays, group: "Pilotage", keywords: "quinzaines fortnight an1 banque bpi" },

  // Modélisation
  { href: "/parameters", label: "Paramètres", icon: Sliders, group: "Modélisation", keywords: "parametres parameters inputs hypotheses edit" },
  { href: "/revenue", label: "Recettes", icon: TrendingUp, group: "Modélisation", keywords: "recettes ca abos prestations" },
  { href: "/costs", label: "Dépenses", icon: Coins, group: "Modélisation", keywords: "depenses opex charges costs" },
  { href: "/salaries", label: "Masse salariale", icon: UsersRound, group: "Modélisation", keywords: "salaires paie cadres freelance" },
  { href: "/capacity-planner", label: "Capacity planner", icon: CalendarDays, group: "Modélisation", keywords: "capacity capacite planning espaces cours coachs heures" },
  { href: "/financing", label: "Financement", icon: Banknote, group: "Modélisation", keywords: "financement levée equity emprunts obligations" },

  // Diagnostic
  { href: "/audit-pack", label: "Audit pack", icon: ShieldCheck, group: "Diagnostic", keywords: "audit pack parcours analyste banquier" },
  { href: "/health-check", label: "Health check", icon: HeartPulse, group: "Diagnostic", keywords: "health check sante diagnostic" },
  { href: "/cross-checks", label: "Cross-checks comptables", icon: ShieldCheck, group: "Diagnostic", keywords: "cross checks coherence comptable bilan" },
  { href: "/audit", label: "Audit & risques", icon: ShieldAlert, group: "Diagnostic", keywords: "audit risques economies" },

  // Sensibilité
  { href: "/sensitivity", label: "Sensibilité ±", icon: TrendingDown, group: "Sensibilité", keywords: "sensibilite stress test sliders" },
  { href: "/monte-carlo", label: "Monte Carlo", icon: Dices, group: "Sensibilité", keywords: "monte carlo simulation aleatoire p10 p50 p90" },
  { href: "/waterfalls", label: "Waterfall charts", icon: Waves, group: "Sensibilité", keywords: "waterfall decomposition cascade" },
  { href: "/variance", label: "Variance (réel/prévu)", icon: GitCompareArrows, group: "Sensibilité", keywords: "variance reel actuals comparaison" },

  // Pitch
  { href: "/executive-summary", label: "Executive summary", icon: Sparkles, group: "Pitch & partage", keywords: "executive summary memo pitch synthese" },
  { href: "/financial-highlights", label: "Synthèse 1-page", icon: Sparkles, group: "Pitch & partage", keywords: "synthese 1-page pitch investisseur" },
  { href: "/use-of-funds", label: "Use of funds", icon: GitBranch, group: "Pitch & partage", keywords: "use funds sankey emplois ressources" },
  { href: "/cap-table", label: "Cap table", icon: PieChart, group: "Pitch & partage", keywords: "cap table actionnariat dilution shareholders" },
  { href: "/share", label: "Partager (lien investisseur)", icon: Send, group: "Pitch & partage", keywords: "share partager lien investisseur watermark" },
  { href: "/full-bp", label: "BP complet (PDF)", icon: FileText, group: "Pitch & partage", keywords: "bp complet pdf print export 13 sections" },

  // Scénarios
  { href: "/assumptions", label: "Hypothèses", icon: ListChecks, group: "Scénarios", keywords: "hypotheses assumptions sources notes" },
  { href: "/scenarios", label: "Mes scénarios", icon: FolderOpen, group: "Scénarios", keywords: "scenarios forks master" },
  { href: "/master-history", label: "Historique masters", icon: History, group: "Scénarios", keywords: "history versions masters" },

  // Outils
  { href: "/audit-log", label: "Audit log", icon: History, group: "Outils", keywords: "audit log diff modifications versions" },
  { href: "/qa", label: "Q&A par champ", icon: MessageSquareText, group: "Outils", keywords: "qa questions reponses commentaires" },
  { href: "/comparables", label: "Comparables marché", icon: Globe, group: "Outils", keywords: "comparables marche benchmarks ihrsa" },
  { href: "/glossary", label: "Glossaire", icon: BookOpen, group: "Outils", keywords: "glossaire glossary termes definitions ebitda" },
  { href: "/data-room", label: "Data room", icon: FolderOpen, group: "Outils", keywords: "data room uploads documents pdf bail" },
  { href: "/backup", label: "Backup JSON", icon: FileJson, group: "Outils", keywords: "backup export import json archivage" },
  { href: "/capacity", label: "Capacité (vue rapide)", icon: Activity, group: "Outils", keywords: "capacite rapide saturation" },
  { href: "/investor", label: "Investisseur (legacy)", icon: Briefcase, group: "Outils", keywords: "investor legacy irr npv multiple" },
];

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Listen Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      // focus input after render
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return COMMANDS;
    return COMMANDS.filter(
      (c) => normalize(c.label).includes(q) || normalize(c.keywords).includes(q) || normalize(c.group).includes(q)
    );
  }, [query]);

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, Cmd[]> = {};
    for (const c of filtered) {
      if (!map[c.group]) map[c.group] = [];
      map[c.group].push(c);
    }
    return map;
  }, [filtered]);

  // Flat indexed list for keyboard navigation
  const flatList = filtered;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flatList.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flatList[activeIdx]) {
      e.preventDefault();
      const target = flatList[activeIdx];
      setOpen(false);
      router.push(target.href);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 supports-backdrop-filter:backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-popover text-popover-foreground rounded-xl border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-2 border-b px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            placeholder="Rechercher une page, un outil..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono">esc</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {flatList.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              Aucune correspondance.
            </div>
          )}
          {Object.entries(grouped).map(([group, cmds]) => (
            <div key={group} className="mb-2">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-bold px-2 pb-1 pt-1">
                {group}
              </div>
              {cmds.map((c) => {
                const idx = flatList.indexOf(c);
                const Icon = c.icon;
                const isActive = idx === activeIdx;
                return (
                  <button
                    key={c.href}
                    onClick={() => {
                      setOpen(false);
                      router.push(c.href);
                    }}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={`w-full flex items-center gap-3 px-2.5 py-1.5 rounded text-sm text-left transition-colors ${
                      isActive
                        ? "bg-[#D32F2F] text-white"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{c.label}</span>
                    <span className="text-[10px] opacity-60 font-mono">{c.href}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="border-t px-3 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
          <div>
            <kbd className="px-1 rounded bg-muted font-mono">↑</kbd>{" "}
            <kbd className="px-1 rounded bg-muted font-mono">↓</kbd> naviguer ·{" "}
            <kbd className="px-1 rounded bg-muted font-mono">↵</kbd> ouvrir
          </div>
          <div>{flatList.length} résultat(s)</div>
        </div>
      </div>
    </div>
  );
}
