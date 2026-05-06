"use client";
import Link from "next/link";
import {
  ClipboardCheck,
  FileText,
  Send,
  Sliders,
  Sparkles,
  TrendingDown,
} from "lucide-react";

type Intent = {
  href: string;
  title: string;
  desc: string;
  icon: typeof Sliders;
  color: string;
  borderColor: string;
};

const INTENTS: Intent[] = [
  {
    href: "/parameters",
    title: "Modifier les hypothèses",
    desc: "Éditer les inputs (timeline, ramp, prix, salaires, CAPEX, financement).",
    icon: Sliders,
    color: "bg-amber-50/40 hover:bg-amber-50",
    borderColor: "border-amber-300",
  },
  {
    href: "/audit-pack",
    title: "Vérifier la cohérence",
    desc: "Parcours d'audit 9 étapes (28 min). Cross-checks, health, comparables.",
    icon: ClipboardCheck,
    color: "bg-emerald-50/40 hover:bg-emerald-50",
    borderColor: "border-emerald-300",
  },
  {
    href: "/sensitivity",
    title: "Tester les sensibilités",
    desc: "Sliders ±20% sur les drivers clés. Voir ce qui casse le BP.",
    icon: TrendingDown,
    color: "bg-blue-50/40 hover:bg-blue-50",
    borderColor: "border-blue-300",
  },
  {
    href: "/executive-summary",
    title: "Pitch investisseur",
    desc: "Memo 2-pages auto-généré, exportable PNG ou PDF.",
    icon: Sparkles,
    color: "bg-[#D32F2F]/5 hover:bg-[#D32F2F]/10",
    borderColor: "border-[#D32F2F]/40",
  },
  {
    href: "/share",
    title: "Partager (lien read-only)",
    desc: "Génère un lien watermarké pour fonds/banque. Snapshot figé.",
    icon: Send,
    color: "bg-indigo-50/40 hover:bg-indigo-50",
    borderColor: "border-indigo-300",
  },
  {
    href: "/full-bp",
    title: "Exporter le BP complet",
    desc: "13 sections paginées prêtes à imprimer en PDF (banque, BPI).",
    icon: FileText,
    color: "bg-slate-50/60 hover:bg-slate-100",
    borderColor: "border-slate-300",
  },
];

export function IntentionHub() {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold tracking-tight">Que veux-tu faire ?</h2>
        <p className="text-[11px] text-muted-foreground">
          Raccourcis vers les actions courantes ·{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">⌘K</kbd> pour
          rechercher
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {INTENTS.map((i) => {
          const Icon = i.icon;
          return (
            <Link
              key={i.href}
              href={i.href}
              className={`flex items-start gap-3 p-3 rounded-lg border ${i.color} ${i.borderColor} transition-colors`}
            >
              <Icon className="h-5 w-5 shrink-0 mt-0.5 text-foreground/70" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{i.title}</div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{i.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
