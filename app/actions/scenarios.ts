"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ModelParams } from "@/lib/model/types";

export type ScenarioRow = {
  id: string;
  name: string;
  params: ModelParams;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function listScenarios(): Promise<ScenarioRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bp_scenarios")
    .select("id, name, params, is_active, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ScenarioRow[];
}

export async function saveScenario(
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
      .select()
      .single();
    if (error) throw new Error(error.message);
    revalidatePath("/", "layout");
    return data as ScenarioRow;
  }

  const { data, error } = await supabase
    .from("bp_scenarios")
    .insert({ user_id: user.id, name, params })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  return data as ScenarioRow;
}

export async function deleteScenario(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("bp_scenarios").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function setActiveScenario(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase.from("bp_scenarios").update({ is_active: false }).eq("user_id", user.id);
  const { error } = await supabase
    .from("bp_scenarios")
    .update({ is_active: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function getActiveScenario(): Promise<ScenarioRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("bp_scenarios")
    .select("id, name, params, is_active, created_at, updated_at")
    .eq("is_active", true)
    .maybeSingle();
  return (data as ScenarioRow) ?? null;
}
