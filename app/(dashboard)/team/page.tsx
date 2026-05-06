import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, AtSign, MapPin } from "lucide-react";

export const metadata = {
  title: "Équipe — BP CFRG",
  description: "Bios des 8 coachs certifiés CrossFit Rive Gauche, équipe de management et gouvernance.",
};

type Coach = {
  slug: string;
  name: string;
  role: string;
  description: string;
  certifications: readonly string[];
  specialties: readonly string[];
  instagram?: string;
};

const COACHS: readonly Coach[] = [
  {
    slug: "matthieu",
    name: "Matthieu Godet",
    role: "Head Coach & Fondateur",
    description:
      "Fondateur de CrossFit Rive Gauche en 2020. 10 ans d'expérience en coaching, spécialisé en arraché (snatch). Encadre la box au quotidien.",
    certifications: ["CrossFit Level 2", "BPJEPS"],
    specialties: ["CrossFit", "Haltérophilie", "Snatch", "Coaching sportif"],
    instagram: "matthieu_coaching",
  },
  {
    slug: "eleonore",
    name: "Eléonore",
    role: "Coach Teens & Masters",
    description:
      "Spécialisée en sport santé et accompagnement sur-mesure. Coach des cours Teens (ados 14+) et Masters (seniors 50+). Spécialiste handstand.",
    certifications: ["CrossFit Level 1", "CQP Instructeur Fitness"],
    specialties: ["Sport santé", "Handstand", "Teens 14+", "Masters 50+"],
    instagram: "eleonor_coaching",
  },
  {
    slug: "flo",
    name: "Flo",
    role: "Coach Méthode Hybride",
    description:
      "Méthode hybride puissance / cardio / longévité. Bienveillance et exigence réunies, attentif et explosif.",
    certifications: ["CrossFit Level 1", "CQP Instructeur Fitness"],
    specialties: ["Power Building", "Hybrid Training", "Conditionnement"],
    instagram: "Flocoelho",
  },
  {
    slug: "morgane",
    name: "Morgane",
    role: "Responsable Running",
    description:
      "Responsable des cours de running et de l'endurance. Spécialiste pull-up strict. Pédagogue et exigeante au service de la progression durable.",
    certifications: ["CrossFit Level 1", "CQP Instructeur Fitness"],
    specialties: ["Running", "Endurance", "Pull-up strict", "Foulée"],
    instagram: "morgane_warzee_coaching",
  },
  {
    slug: "alex",
    name: "Alex",
    role: "Spécialiste Hyrox",
    description:
      "Spécialiste de l'Hyrox et de la préparation aux concours des forces de l'ordre. Expert Power Building et Hybrid Training.",
    certifications: ["CrossFit Level 1", "CQP Instructeur Fitness"],
    specialties: ["Hyrox", "Prépa forces de l'ordre", "Power Building"],
    instagram: "alexvazquez_coach",
  },
  {
    slug: "virginie",
    name: "Virginie",
    role: "Coach Sport Santé",
    description:
      "Sport santé et performance. Coach attentive et empathique avec un cardio et un mental solides. Spécialiste sled push.",
    certifications: ["CrossFit Level 1", "CQP Instructeur Fitness"],
    specialties: ["Sport santé", "Sled push", "Conditionnement"],
    instagram: "virginie_barnaba",
  },
  {
    slug: "antoine",
    name: "Antoine",
    role: "Spécialiste Haltérophilie",
    description:
      "Coach passionné par la force et l'haltérophilie olympique. Pédagogue, exigeant et bienveillant. La technique avant la charge.",
    certifications: ["CrossFit Level 1", "BPJEPS"],
    specialties: ["Haltérophilie", "Snatch", "Clean & Jerk", "Force"],
    instagram: "antoine_asb",
  },
  {
    slug: "antonin",
    name: "Antonin",
    role: "Spécialiste Gymnastique",
    description:
      "Spécialiste gymnastique et muscle-up. Coach attentionné et efficace, alliant technicité, pédagogie et bonne humeur.",
    certifications: ["CrossFit Level 1", "CQP Instructeur Fitness"],
    specialties: ["Gymnastique", "Muscle-up", "Toes-to-bar", "Ring work"],
    instagram: "antonindolet",
  },
];

const TEAM_STATS = [
  { label: "Coachs certifiés", value: "8" },
  { label: "Certifications CrossFit", value: "L1 × 7 · L2 × 1" },
  { label: "Diplômes État", value: "BPJEPS × 2 · CQP × 6" },
  { label: "Spécialités couvertes", value: "11+" },
] as const;

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Équipe & gouvernance</h1>
        <p className="text-muted-foreground text-sm mt-1">
          8 coachs certifiés CrossFit + diplômes État. Équipe en place depuis l&apos;ouverture (2020).
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TEAM_STATS.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                {s.label}
              </div>
              <div className="text-2xl font-bold mt-1 font-mono">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Founder</CardTitle>
          <CardDescription>
            CrossFit Rive Gauche fondée en 2020 — 5+ années d&apos;exploitation continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm">
              Implantation : 105 rue de Tolbiac, 75013 Paris — Métros Olympiades (L14) &amp; Tolbiac (L7).
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Award className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm">
              Affiliations : <strong>CrossFit HQ</strong> (officiel) · <strong>Hyrox Training Club</strong> (officiel).
            </p>
          </div>
        </CardContent>
      </Card>

      <section>
        <h2 className="text-xl font-bold tracking-tight mb-3 font-heading uppercase">
          Coachs (8)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {COACHS.map((c) => (
            <Card key={c.slug}>
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-sm leading-tight">{c.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{c.role}</div>
                  </div>
                  {c.instagram ? (
                    <a
                      href={`https://www.instagram.com/${c.instagram}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={`Instagram ${c.name}`}
                    >
                      <AtSign className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {c.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {c.certifications.map((cert) => (
                    <Badge key={cert} variant="secondary" className="text-[10px]">
                      {cert}
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {c.specialties.map((s) => (
                    <span
                      key={s}
                      className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Note investisseur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Équipe complète couvre <strong>l&apos;intégralité du périmètre programmatique</strong> :
            CrossFit, Hyrox, haltérophilie, gymnastique, running, sport santé, masters, teens, prépa forces de l&apos;ordre.
          </p>
          <p>
            Aucune dépendance critique à un coach unique grâce au mix de spécialités.
            Les 7 CF Level 1 + 1 CF Level 2 garantissent l&apos;affiliation CrossFit HQ, et les diplômes
            État (BPJEPS × 2 · CQP × 6) couvrent la conformité réglementaire (Code du sport).
          </p>
          <p>
            Source des bios : page publique <code>crossfitrg.com/coachs</code> avec graphe JSON-LD
            structuré (Person × 8 + EducationalOccupationalCredential).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
