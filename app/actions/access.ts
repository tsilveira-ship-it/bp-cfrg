"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AccessRow = {
  id: string;
  email: string;
  role: "admin" | "viewer";
  created_at: string;
};

export async function getMyRole(): Promise<"admin" | "viewer" | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const { data } = await supabase
    .from("bp_access")
    .select("role")
    .ilike("email", user.email)
    .maybeSingle();
  return (data?.role as "admin" | "viewer" | undefined) ?? null;
}

export async function listAccess(): Promise<AccessRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bp_access")
    .select("id, email, role, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AccessRow[];
}

export async function inviteUser(email: string, role: "admin" | "viewer"): Promise<AccessRow> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const clean = email.trim().toLowerCase();
  if (!clean.includes("@")) throw new Error("Email invalide");

  const { data, error } = await supabase
    .from("bp_access")
    .insert({ email: clean, role, invited_by: user.id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  return data as AccessRow;
}

export async function updateRole(id: string, role: "admin" | "viewer"): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("bp_access").update({ role }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function revokeAccess(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("bp_access").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
