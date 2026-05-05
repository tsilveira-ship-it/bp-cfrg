"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ModelParams } from "@/lib/model/types";

export type ScenarioRow = {
  id: string;
  user_id: string;
  name: string;
  params: ModelParams;
  is_active: boolean;
  is_master: boolean;
  version: number;
  parent_id: string | null;
  author_email: string | null;
  published_at: string | null;
  previous_params: ModelParams | null;
  created_at: string;
  updated_at: string;
};

const SELECT_COLS =
  "id, user_id, name, params, is_active, is_master, version, parent_id, author_email, published_at, previous_params, created_at, updated_at";

export async function listMasters(): Promise<ScenarioRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bp_scenarios")
    .select(SELECT_COLS)
    .eq("is_master", true)
    .order("version", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ScenarioRow[];
}

export async function getCurrentMaster(): Promise<ScenarioRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("bp_scenarios")
    .select(SELECT_COLS)
    .eq("is_master", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ScenarioRow) ?? null;
}

export async function listMyForks(): Promise<ScenarioRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bp_scenarios")
    .select(SELECT_COLS)
    .eq("is_master", false)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ScenarioRow[];
}

export async function saveFork(
  name: string,
  params: ModelParams,
  id?: string
): Promise<ScenarioRow> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (id) {
    const { data, error } = await supabase
      .from("bp_scenarios")
      .update({ name, params })
      .eq("id", id)
      .select(SELECT_COLS)
      .single();
    if (error) throw new Error(error.message);
    revalidatePath("/", "layout");
    return data as ScenarioRow;
  }

  const { data, error } = await supabase
    .from("bp_scenarios")
    .insert({
      user_id: user.id,
      name,
      params,
      author_email: user.email,
      is_master: false,
    })
    .select(SELECT_COLS)
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  return data as ScenarioRow;
}

export async function autoSaveFork(id: string, params: ModelParams): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("bp_scenarios")
    .update({ params })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function undoLastSave(id: string): Promise<ScenarioRow> {
  const supabase = await createSupabaseServerClient();
  const { data: cur, error: e1 } = await supabase
    .from("bp_scenarios")
    .select("previous_params")
    .eq("id", id)
    .single();
  if (e1) throw new Error(e1.message);
  if (!cur?.previous_params) throw new Error("Aucune version précédente");

  const { data, error } = await supabase
    .from("bp_scenarios")
    .update({ params: cur.previous_params })
    .eq("id", id)
    .select(SELECT_COLS)
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  return data as ScenarioRow;
}

export async function deleteFork(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("bp_scenarios").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function forkFromMaster(masterId: string, name?: string): Promise<ScenarioRow> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: master, error: e1 } = await supabase
    .from("bp_scenarios")
    .select("params, name, version")
    .eq("id", masterId)
    .single();
  if (e1) throw new Error(e1.message);

  const forkName = name ?? `Fork de ${master.name} (v${master.version})`;
  const { data, error } = await supabase
    .from("bp_scenarios")
    .insert({
      user_id: user.id,
      name: forkName,
      params: master.params,
      author_email: user.email,
      parent_id: masterId,
      is_master: false,
    })
    .select(SELECT_COLS)
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  return data as ScenarioRow;
}

export async function publishAsMaster(
  forkId: string | null,
  params: ModelParams,
  name: string,
  notes?: string
): Promise<ScenarioRow> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check admin
  const { data: access } = await supabase
    .from("bp_access")
    .select("role")
    .ilike("email", user.email ?? "")
    .maybeSingle();
  if (access?.role !== "admin") throw new Error("Admin only");

  const { data: latest } = await supabase
    .from("bp_scenarios")
    .select("version")
    .eq("is_master", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersion = (latest?.version ?? 0) + 1;

  const finalName = notes ? `${name} — ${notes}` : name;

  const { data, error } = await supabase
    .from("bp_scenarios")
    .insert({
      user_id: user.id,
      name: finalName,
      params,
      author_email: user.email,
      is_master: true,
      version: nextVersion,
      parent_id: forkId,
      published_at: new Date().toISOString(),
    })
    .select(SELECT_COLS)
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  return data as ScenarioRow;
}

export async function deleteMaster(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("bp_scenarios").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function getScenarioById(id: string): Promise<ScenarioRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("bp_scenarios")
    .select(SELECT_COLS)
    .eq("id", id)
    .maybeSingle();
  return (data as ScenarioRow) ?? null;
}
