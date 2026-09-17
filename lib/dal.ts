import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { ProfileRow } from "./supabase/types";

// Checagem "segura" (bate no Supabase) para Server Components/Actions. O proxy.ts faz
// apenas a checagem otimista via cookie para redirecionar cedo.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const requireUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});

export const getCurrentProfile = cache(async (): Promise<ProfileRow | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as ProfileRow) ?? null;
});

export const requireProfile = cache(async (): Promise<ProfileRow> => {
  await requireUser();
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
});
