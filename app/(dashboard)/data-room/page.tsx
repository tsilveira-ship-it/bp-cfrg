"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  FolderOpen,
  Trash2,
  Upload,
} from "lucide-react";
import {
  deleteAttachment,
  getDownloadUrl,
  listAttachments,
  uploadAttachment,
  type Attachment,
} from "@/app/actions/attachments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DataRoomPage() {
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ kind: "ok" | "error"; msg: string } | null>(null);
  const [fieldPath, setFieldPath] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    setLoading(true);
    listAttachments().then((data) => {
      setItems(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    refresh();
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    if (fieldPath) fd.append("fieldPath", fieldPath);
    setStatus(null);
    startTransition(async () => {
      const res = await uploadAttachment(fd);
      if (res.ok) {
        setStatus({ kind: "ok", msg: `${file.name} uploadé.` });
        refresh();
      } else {
        setStatus({ kind: "error", msg: res.error });
      }
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const onDelete = (path: string, name: string) => {
    if (!confirm(`Supprimer ${name} ?`)) return;
    startTransition(async () => {
      const res = await deleteAttachment(path);
      if (res.ok) {
        setStatus({ kind: "ok", msg: `${name} supprimé.` });
        refresh();
      } else {
        setStatus({ kind: "error", msg: res.error ?? "Erreur" });
      }
    });
  };

  const onDownload = async (path: string) => {
    const url = await getDownloadUrl(path);
    if (url) window.open(url, "_blank");
    else setStatus({ kind: "error", msg: "Impossible de générer l'URL signée." });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FolderOpen className="h-7 w-7 text-[#D32F2F]" /> Data room
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pièces jointes du BP : devis, bail, contrats, études, K-bis, statuts. Stockage privé Supabase
          avec liens signés à durée limitée.
        </p>
      </header>

      {status && (
        <div
          className={
            "flex items-start gap-2 p-3 rounded-md border text-sm " +
            (status.kind === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-red-300 bg-red-50 text-red-800")
          }
        >
          {status.kind === "ok" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <span>{status.msg}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" /> Uploader un document
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            PDF, images (PNG/JPG/WebP), Word, Excel, CSV, TXT. Max 50 MB.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Champ associé (optionnel)</Label>
            <Input
              placeholder="ex: rent.monthlyByFy.0 — pour rattacher le PDF du bail au champ loyer M0"
              value={fieldPath}
              onChange={(e) => setFieldPath(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Permet de retrouver la source d&apos;un chiffre depuis /assumptions.
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            onChange={onFileChange}
            className="block text-sm w-full"
            accept="application/pdf,image/png,image/jpeg,image/webp,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv,text/plain"
            disabled={pending}
          />
          {pending && <p className="text-xs text-muted-foreground">Upload en cours...</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Documents{" "}
            <span className="text-xs text-muted-foreground font-normal">
              ({items.length} {loading ? "(chargement...)" : ""})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {!loading && items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun document. Upload ton premier devis/bail/contrat ci-dessus.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fichier</TableHead>
                  <TableHead>Champ associé</TableHead>
                  <TableHead className="text-right">Taille</TableHead>
                  <TableHead>Uploadé le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm">{a.name}</span>
                      {a.contentType && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {a.contentType.split("/")[1] ?? a.contentType}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {a.fieldPath || "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono">
                      {fmtSize(a.size)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(a.uploadedAt).toLocaleString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" onClick={() => onDownload(a.id)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(a.id, a.name)}
                        disabled={pending}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="pt-5">
          <h3 className="font-semibold text-sm mb-2">Documents typiques pour audit</h3>
          <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-0.5">
            <li>Bail commercial signé / lettre d&apos;intention bailleur</li>
            <li>Devis travaux + équipement (CAPEX justifié)</li>
            <li>K-bis société / statuts</li>
            <li>Contrats partenaires (CrossFit affiliation, Hyrox, ...)</li>
            <li>CV fondateurs + Headcoachs (preuve compétence)</li>
            <li>Études marché commandées (Xerfi, FFGym, BPI)</li>
            <li>Avis comptable / attestation expert-comptable</li>
            <li>Pièces juridiques (assurance RC pro, hygiène DDPP)</li>
            <li>Sources benchmarks utilisés (rapports IHRSA, FFGym, etc.)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
