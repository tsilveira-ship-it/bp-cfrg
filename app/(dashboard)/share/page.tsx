"use client";
import { useMemo, useState } from "react";
import { Copy, Eye, Link2, ShieldCheck, Send } from "lucide-react";
import { useModelStore } from "@/lib/store";
import { encodeToken } from "@/lib/share-token";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScenarioSwitcher } from "@/components/scenario-switcher";

export default function SharePage() {
  const params = useModelStore((s) => s.params);
  const [investorName, setInvestorName] = useState("");
  const [copied, setCopied] = useState(false);

  const token = useMemo(() => encodeToken(params), [params]);
  const url = useMemo(() => {
    if (typeof window === "undefined") return "";
    const u = new URL("/investor-view", window.location.origin);
    u.searchParams.set("d", token);
    if (investorName.trim()) u.searchParams.set("n", investorName.trim());
    return u.toString();
  }, [token, investorName]);

  const onCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const sizeKb = (token.length * 0.75) / 1024;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Send className="h-7 w-7 text-[#D32F2F]" /> Partager (vue read-only)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Génère un lien public read-only du scénario actif. L&apos;investisseur ne peut ni
            éditer ni voir les autres scénarios.
          </p>
        </div>
        <ScenarioSwitcher />
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration du lien</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Nom de l&apos;investisseur (apparaît dans le watermark)</Label>
            <Input
              placeholder="ex: Pierre Dupont — BPI"
              value={investorName}
              onChange={(e) => setInvestorName(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs">Lien à partager</Label>
            <div className="flex gap-2 mt-1">
              <Input value={url} readOnly className="font-mono text-xs" />
              <Button onClick={onCopy} variant="outline">
                <Copy className="h-3.5 w-3.5" /> {copied ? "Copié !" : "Copier"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Token : {sizeKb.toFixed(1)} KB encodés en base64url. Snapshot figé au moment de la
              génération du lien — pas de mise à jour automatique si tu modifies les paramètres.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border bg-background hover:bg-muted text-sm font-medium"
            >
              <Eye className="h-3.5 w-3.5" /> Aperçu dans un nouvel onglet
            </a>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-300 bg-amber-50/30">
        <CardContent className="pt-5 space-y-2">
          <div className="flex items-start gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800">Sécurité — limites de l&apos;implémentation MVP</p>
              <ul className="text-xs text-amber-800/80 list-disc pl-5 space-y-1 mt-1">
                <li>Le token contient les paramètres en clair encodés base64url. <b>Toute personne avec le lien peut voir le scénario.</b></li>
                <li>Pas de révocation côté serveur (le lien reste valide tant que partagé).</li>
                <li>Pas de tracking d&apos;accès (qui a vu, quand).</li>
                <li>À termes (roadmap): table <span className="font-mono">share_links</span> Supabase + magic link + révocation + logs.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
