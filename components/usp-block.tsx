import {
  Award,
  Building2,
  Dumbbell,
  Users,
  UserCheck,
  CalendarClock,
  Sparkles,
  Target,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Usp = {
  icon: typeof Award;
  title: string;
  proof: string;
};

const USPS: Usp[] = [
  {
    icon: Award,
    title: "CrossFit + Hyrox officiel",
    proof: "Double affiliation rare en Paris intra-muros",
  },
  {
    icon: Building2,
    title: "300 m² · 3 niveaux",
    proof: "Floor RDC + mezzanine lounge + vestiaires sous-sol",
  },
  {
    icon: Dumbbell,
    title: "Équipement compétition",
    proof: "Eleiko · Fit & Rack · Concept 2 · DimaSport",
  },
  {
    icon: UserCheck,
    title: "8 coachs certifiés",
    proof: "CrossFit L1/L2 + BPJEPS / CQP (diplômes État)",
  },
  {
    icon: Users,
    title: "Cours plafonnés à 16",
    proof: "Coaching personnalisé garanti",
  },
  {
    icon: CalendarClock,
    title: "50+ créneaux / semaine",
    proof: "Ouvert 7j/7 — 6h15 à 22h en semaine",
  },
  {
    icon: Sparkles,
    title: "Funnel low-friction",
    proof: "Bilan Forme 19,90 € (vs 80 €) — conversion documentée",
  },
  {
    icon: Target,
    title: "Niches sous-exploitées",
    proof: "Teens · Masters · Prépa forces de l'ordre · Sport santé",
  },
];

export function UspBlock({
  title = "Proposition de valeur",
  subtitle = "8 différenciants documentés sur le site live crossfitrg.com",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-xl font-bold tracking-tight font-heading uppercase">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {USPS.map((u) => {
          const Icon = u.icon;
          return (
            <Card key={u.title}>
              <CardContent className="pt-5 space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[var(--color-brand-red,#D32F2F)]" />
                  <div className="text-sm font-bold leading-tight">
                    {u.title}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {u.proof}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
