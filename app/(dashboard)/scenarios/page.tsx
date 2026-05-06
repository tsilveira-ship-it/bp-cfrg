import { ScenariosManager } from "@/components/scenarios-manager";
import { getMyRole } from "@/app/actions/access";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, GitFork, Info } from "lucide-react";

export default async function ScenariosPage() {
  const role = await getMyRole();
  const isAdmin = role === "admin";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Scénarios</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Versions Master partagées + tes forks personnels.
        </p>
      </header>

      <Card className="border-blue-300 bg-blue-50/40">
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm text-blue-900">Comment ça marche</h3>
              <p className="text-xs text-blue-900/80 mt-1">
                Le BP s&apos;appuie sur un système de versions inspiré de git. Comprendre la
                différence entre Master et Fork est essentiel pour collaborer sans écraser le
                travail des autres.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-md border border-[#D32F2F]/30 bg-white p-3">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4 text-[#D32F2F]" />
                <span className="font-semibold text-sm">Master</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  version officielle
                </span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Version <b>partagée</b> par tous les utilisateurs.</li>
                <li>Le Master avec la version la plus élevée est <b>chargé automatiquement</b> à
                  l&apos;ouverture de l&apos;app pour tout le monde — c&apos;est la &laquo;&nbsp;version par défaut&nbsp;&raquo;.</li>
                <li>Publier un nouveau Master crée une nouvelle ligne (version = max + 1). Les
                  anciennes versions restent consultables (<a href="/master-history" className="underline">/master-history</a>).</li>
                <li>Seuls les <b>admins</b> peuvent publier un Master.</li>
              </ul>
            </div>

            <div className="rounded-md border bg-white p-3">
              <div className="flex items-center gap-2 mb-2">
                <GitFork className="h-4 w-4 text-emerald-700" />
                <span className="font-semibold text-sm">Fork</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  ta copie perso
                </span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Copie <b>privée</b> du Master, à toi seul.</li>
                <li>Toutes tes modifications de paramètres sont auto-sauvées dans ton fork actif
                  (badge &laquo;&nbsp;Fork sauvé&nbsp;&raquo; en bas à droite).</li>
                <li>N&apos;impacte pas les autres utilisateurs tant que tu ne le promeus pas en
                  Master.</li>
                <li>Tu peux avoir plusieurs forks (pessimist / base / optimist).</li>
              </ul>
            </div>
          </div>

          <div className="rounded-md border border-amber-300 bg-amber-50/50 p-3 text-xs">
            <div className="font-semibold text-amber-900 mb-1">
              💡 Promouvoir tes chiffres en nouvelle version par défaut
            </div>
            <ol className="text-amber-900/80 list-decimal pl-5 space-y-0.5">
              <li>Édite tes chiffres dans <a href="/parameters" className="underline">/parameters</a> (ou outils dédiés) — ça met à jour ton fork.</li>
              <li>Reviens sur cette page.</li>
              <li>Dans la section <b>&laquo;&nbsp;Publier nouvelle version Master&nbsp;&raquo;</b>, donne un nom + notes
                (ex: &laquo;&nbsp;Master v2 — capacité ajustée Q2 2026&nbsp;&raquo;).</li>
              <li>Clic <b>&laquo;&nbsp;Publier&nbsp;&raquo;</b>. La nouvelle version devient automatiquement la version par
                défaut chargée à chaque ouverture de l&apos;app.</li>
            </ol>
            {!isAdmin && (
              <div className="mt-2 pt-2 border-t border-amber-300/60 text-amber-900">
                ⚠️ Tu n&apos;as pas le rôle admin — tu peux éditer ton fork mais pas publier un
                Master. Demande à l&apos;admin de te promouvoir via <a href="/admin" className="underline">/admin</a>.
              </div>
            )}
          </div>

          <div className="rounded-md border bg-white p-3 text-xs">
            <div className="font-semibold text-sm mb-1">Cas d&apos;usage typiques</div>
            <ul className="text-muted-foreground space-y-1 list-disc pl-4">
              <li>
                <b>Tester une variante</b> : ouvre un fork, joue avec les paramètres, compare
                via <a href="/compare" className="underline">/compare</a> ou <a href="/audit-log" className="underline">/audit-log</a>.
              </li>
              <li>
                <b>Figer un trimestre</b> : à chaque revue trimestrielle, l&apos;admin publie une
                nouvelle version Master. L&apos;historique reste sur <a href="/master-history" className="underline">/master-history</a>.
              </li>
              <li>
                <b>Partager pour audit</b> : utilise <a href="/share" className="underline">/share</a> pour générer un lien read-only
                d&apos;un fork ou d&apos;un Master.
              </li>
              <li>
                <b>Rollback</b> : si une version Master a une erreur, republie l&apos;ancienne
                version (importe ses params via <a href="/backup" className="underline">/backup</a> puis publie).
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <ScenariosManager isAdmin={isAdmin} />
    </div>
  );
}
