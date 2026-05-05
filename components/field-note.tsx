"use client";
import { useEffect, useRef, useState } from "react";
import { MessageSquarePlus, MessageSquareText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useModelStore } from "@/lib/store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  path: string;
  /** Label affiché dans le dialog header. */
  label?: string;
};

/**
 * Bouton d'annotation par champ (#11). Apparait à côté d'un champ paramètre.
 * - Si une note existe : icône remplie, clic ouvre le dialog d'édition.
 * - Sinon : icône fantôme "+" qui apparait au hover du parent (.group/field).
 */
export function FieldNote({ path, label }: Props) {
  const fieldNote = useModelStore((s) => s.params.fieldNotes?.[path]);
  const setFieldNote = useModelStore((s) => s.setFieldNote);
  const clearFieldNote = useModelStore((s) => s.clearFieldNote);
  const [open, setOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [authorEmail, setAuthorEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        if (active) setAuthorEmail(data.user?.email ?? undefined);
      });
    return () => {
      active = false;
    };
  }, []);

  const hasNote = !!fieldNote;

  const onSave = () => {
    const v = textareaRef.current?.value ?? "";
    setFieldNote(path, v, authorEmail);
    setOpen(false);
  };
  const onDelete = () => {
    clearFieldNote(path);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={hasNote ? "Voir/éditer la note" : "Ajouter une note"}
            title={hasNote ? `Note: ${fieldNote.note}` : "Ajouter une note"}
            className={
              "inline-flex items-center justify-center h-5 w-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors " +
              (hasNote
                ? "text-amber-600 hover:text-amber-700"
                : "opacity-0 group-hover/field:opacity-100 focus-visible:opacity-100")
            }
          />
        }
      >
        {hasNote ? (
          <MessageSquareText className="h-3.5 w-3.5" />
        ) : (
          <MessageSquarePlus className="h-3.5 w-3.5" />
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Note — {label ?? path}</DialogTitle>
          <p className="text-xs text-muted-foreground font-mono">{path}</p>
        </DialogHeader>
        <textarea
          key={open ? `open-${path}` : "closed"}
          ref={textareaRef}
          defaultValue={fieldNote?.note ?? ""}
          placeholder="Justification, source, hypothèse, contexte..."
          className="min-h-[120px] w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
          autoFocus
        />
        {fieldNote && (fieldNote.author || fieldNote.date) ? (
          <p className="text-[11px] text-muted-foreground">
            Dernière édition: {fieldNote.author ?? "—"} ·{" "}
            {fieldNote.date ? new Date(fieldNote.date).toLocaleString("fr-FR") : ""}
          </p>
        ) : null}
        <DialogFooter>
          {hasNote && (
            <Button variant="ghost" onClick={onDelete} className="mr-auto text-destructive">
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </Button>
          )}
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={onSave}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
