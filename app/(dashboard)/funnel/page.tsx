import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Inbox,
  CreditCard,
  UserCheck,
  Repeat2,
  TrendingUp,
  Database,
  Bell,
  Mail,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

export const metadata = {
  title: "Funnel d'acquisition — BP CFRG",
  description:
    "Dashboard CRM en production. Suivi prospects → paiements → adhérents → rétention 90j. Stack Supabase + n8n + Next.js.",
};

type Stage = {
  icon: typeof Inbox;
  label: string;
  count: string;
  detail: string;
  source: string;
};

const STAGES: readonly Stage[] = [
  {
    icon: Inbox,
    label: "Prospects",
    count: "350",
    detail: "220 brochure · 100 ResaWod · 30 site web",
    source: "Forms publics + n8n webhook",
  },
  {
    icon: CreditCard,
    label: "Bilans payés",
    count: "57",
    detail: "Tous bilans 9,90 € — 564,30 € cumulés",
    source: "Stripe trigger n8n → ingest payments",
  },
  {
    icon: UserCheck,
    label: "Customers",
    count: "135",
    detail: "33 abonnés actifs · 8 carnets actifs",
    source: "ResaWod API cron 12h",
  },
  {
    icon: Repeat2,
    label: "Séances 30j glissants",
    count: "303",
    detail: "Top 10 actifs : 8-17 séances / mois",
    source: "Sessions importées + ResaWod sync",
  },
];

type Capability = {
  icon: typeof Database;
  title: string;
  body: string;
};

const CAPABILITIES: readonly Capability[] = [
  {
    icon: Bell,
    title: "Alertes décrochage 90 jours",
    body: "Détection automatique des adhérents dont la fréquentation chute pendant les 90 premiers jours — intervention staff avant perte définitive.",
  },
  {
    icon: Mail,
    title: "Séquences email automatisées",
    body: "Relance brochure J+3 / J+6 + email digest staff (cron n8n 08h). Tokens unsub générés par séquence.",
  },
  {
    icon: TrendingUp,
    title: "Funnel 3 niveaux + délais médians",
    body: "Filtres 7j/30j/90j/12m/cumul. Breakdown par canal d'origine. Conversion mesurée à chaque étape.",
  },
  {
    icon: ShieldCheck,
    title: "Conformité RGPD",
    body: "Boutons manuels purge prospects non convertis > 6 mois / > 2 ans. Aucune purge automatique.",
  },
];

const ROUTES = [
  { path: "/dashboard", label: "Aujourd'hui — inbox actionnable" },
  { path: "/dashboard/vue-ensemble", label: "KPIs 30j + funnel + base adhérents" },
  { path: "/dashboard/prospects", label: "Table 350 prospects, badges multi-canal" },
  { path: "/dashboard/adherents", label: "Onglets Abonnés / Carnet / À risque / Lapsés" },
  { path: "/dashboard/paiements", label: "Stripe history, filtre kind" },
  { path: "/dashboard/carnets", label: "Vouchers actifs/expirés" },
  { path: "/dashboard/sequences", label: "Séquences email + tokens unsub" },
  { path: "/dashboard/cohortes", label: "Rétention 90j par cohorte" },
] as const;

const STACK = [
  { layer: "Ingestion", value: "n8n (13 workflows) — Forms · Stripe · ResaWod" },
  { layer: "Storage", value: "Supabase Postgres — schéma dédié crm.*" },
  { layer: "Front", value: "Next.js 16 + Vercel — gate HMAC + noindex" },
  { layer: "Email", value: "Resend (n8n) + tokens unsub publics" },
  { layer: "Auth", value: "Cookie HMAC TTL 12h (mot de passe partagé)" },
  { layer: "Match key", value: "Email normalisé (lowercase + trim)" },
] as const;

export default function FunnelPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Funnel d&apos;acquisition</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Dashboard CRM en production · pilotage data-driven prospects → adhérents → rétention 90j.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pourquoi cette page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            CFRG ne pilote pas le BP en théorie. Un dashboard CRM est <strong>déjà déployé</strong>
            (URL <code>crossfitrg-web.vercel.app/dashboard</code>) qui ingère prospects, paiements
            Stripe et historique de séances ResaWod, avec alertes de décrochage automatiques.
          </p>
          <p className="text-muted-foreground">
            Cette page synthétise les données opérationnelles (snapshot avril 2026) et la stack
            technique pour les investisseurs : preuve d&apos;exécution + capacité de scaling.
          </p>
        </CardContent>
      </Card>

      <section>
        <h2 className="text-xl font-bold tracking-tight mb-3 font-heading uppercase">
          Funnel data (snapshot avril 2026)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STAGES.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <CardContent className="pt-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-[var(--color-brand-red,#D32F2F)]" />
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                      {s.label}
                    </div>
                  </div>
                  <div className="text-2xl font-bold font-mono">{s.count}</div>
                  <div className="text-xs text-muted-foreground">{s.detail}</div>
                  <div className="text-[10px] text-muted-foreground/70 italic pt-1 border-t">
                    {s.source}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold tracking-tight mb-3 font-heading uppercase">
          Capacités opérationnelles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CAPABILITIES.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.title}>
                <CardContent className="pt-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-[var(--color-brand-red,#D32F2F)]" />
                    <div className="text-sm font-bold">{c.title}</div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{c.body}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stack technique</CardTitle>
          <CardDescription>Reproductible si scaling multi-sites / franchise.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {STACK.map((s) => (
              <div key={s.layer} className="flex items-start gap-3 text-sm border-b pb-2 last:border-0">
                <div className="w-24 shrink-0 text-xs text-muted-foreground uppercase tracking-wider pt-0.5">
                  {s.layer}
                </div>
                <div className="flex-1">{s.value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Routes dashboard live</CardTitle>
          <CardDescription>
            Toutes derrière auth HMAC + noindex robots.txt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {ROUTES.map((r) => (
              <li key={r.path} className="flex items-center gap-3 text-sm">
                <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{r.path}</code>
                <span className="text-muted-foreground text-xs">{r.label}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Argument investisseur — pourquoi c&apos;est un atout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-3">
            <Badge variant="secondary" className="shrink-0">1</Badge>
            <p>
              <strong>Pas un BP théorique</strong> — l&apos;outil de pilotage est en prod, alimenté par
              350 prospects historiques et 5+ années d&apos;exploitation.
            </p>
          </div>
          <div className="flex gap-3">
            <Badge variant="secondary" className="shrink-0">2</Badge>
            <p>
              <strong>Attribution canal mesurable</strong> — brochure 63% · ResaWod 29% · siteweb 8%.
              Permet d&apos;optimiser le CAC marketing par canal.
            </p>
          </div>
          <div className="flex gap-3">
            <Badge variant="secondary" className="shrink-0">3</Badge>
            <p>
              <strong>Rétention 90j trackée nativement</strong> — driver clé du modèle financier
              <code className="mx-1 text-xs bg-muted px-1 py-0.5 rounded">/investor</code> (LTV/CAC).
            </p>
          </div>
          <div className="flex gap-3">
            <Badge variant="secondary" className="shrink-0">4</Badge>
            <p>
              <strong>Stack reproductible</strong> — Supabase + n8n cloud + Next.js Vercel.
              Multi-sites ou franchise avec coût marginal d&apos;ingénierie quasi nul.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
