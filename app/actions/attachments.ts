"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BUCKET = "bp-attachments";

export type Attachment = {
  id: string;          // path in bucket (userId/filename)
  name: string;        // original filename
  size: number;
  contentType: string | null;
  uploadedAt: string;  // ISO
  scenarioId?: string;
  fieldPath?: string;  // path du champ associé (ex: "rent.monthlyByFy.0")
};

export async function listAttachments(scenarioId?: string): Promise<Attachment[]> {
  const sb = await createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];

  // List user's folder
  const { data, error } = await sb.storage.from(BUCKET).list(user.id, {
    limit: 200,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error) {
    console.error("listAttachments error", error);
    return [];
  }
  // Fetch metadata pour chaque fichier (via getPublicUrl ou metadata stockée)
  return (data ?? [])
    .filter((f) => f.name && !f.name.endsWith("/"))
    .map((f): Attachment => {
      const m = (f.metadata ?? {}) as Record<string, unknown>;
      return {
        id: `${user.id}/${f.name}`,
        name: (m.originalName as string) ?? f.name,
        size: f.metadata?.size ?? 0,
        contentType: (f.metadata?.mimetype as string) ?? null,
        uploadedAt: f.created_at ?? new Date().toISOString(),
        scenarioId: (m.scenarioId as string) ?? undefined,
        fieldPath: (m.fieldPath as string) ?? undefined,
      };
    })
    .filter((a) => !scenarioId || a.scenarioId === scenarioId || !a.scenarioId);
}

export async function uploadAttachment(
  formData: FormData
): Promise<{ ok: true; attachment: Attachment } | { ok: false; error: string }> {
  const sb = await createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié" };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Fichier manquant" };
  if (file.size > 50 * 1024 * 1024) return { ok: false, error: "Fichier > 50 MB" };

  const scenarioId = (formData.get("scenarioId") as string) || "";
  const fieldPath = (formData.get("fieldPath") as string) || "";

  const safeName = file.name.replace(/[^\w.-]/g, "_");
  const objectPath = `${user.id}/${Date.now()}_${safeName}`;

  const { error } = await sb.storage.from(BUCKET).upload(objectPath, file, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
    metadata: {
      originalName: file.name,
      scenarioId,
      fieldPath,
    },
  });
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    attachment: {
      id: objectPath,
      name: file.name,
      size: file.size,
      contentType: file.type,
      uploadedAt: new Date().toISOString(),
      scenarioId: scenarioId || undefined,
      fieldPath: fieldPath || undefined,
    },
  };
}

export async function deleteAttachment(path: string): Promise<{ ok: boolean; error?: string }> {
  const sb = await createSupabaseServerClient();
  const { error } = await sb.storage.from(BUCKET).remove([path]);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getDownloadUrl(path: string): Promise<string | null> {
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data) return null;
  return data.signedUrl;
}
