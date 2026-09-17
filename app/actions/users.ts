"use server";

import { requireAdmin } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/supabase/types";

export interface ManagedUser {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  last_sign_in_at: string | null;
}

export async function listUsers(): Promise<ManagedUser[]> {
  await requireAdmin();
  const admin = createAdminClient();

  const [{ data: authList, error: authError }, { data: profiles, error: profilesError }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 200 }),
    admin.from("profiles").select("*"),
  ]);
  if (authError) throw new Error(authError.message);
  if (profilesError) throw new Error(profilesError.message);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  return authList.users
    .map((u) => {
      const profile = profileById.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        full_name: profile?.full_name ?? null,
        role: profile?.role ?? "user",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
      };
    })
    .sort((a, b) => a.email.localeCompare(b.email));
}

export async function createUser(input: { email: string; password: string; fullName: string; role: UserRole }) {
  await requireAdmin();
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  if (!email || !input.password || input.password.length < 6) {
    return { error: "Email obrigatório e senha com pelo menos 6 caracteres." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });
  if (error) return { error: error.message };

  const userId = data.user.id;
  const { error: profileError } = await admin
    .from("profiles")
    .update({ full_name: fullName || email, role: input.role })
    .eq("id", userId);
  if (profileError) return { error: profileError.message };

  const user: ManagedUser = {
    id: userId, email, full_name: fullName || email, role: input.role,
    created_at: data.user.created_at, last_sign_in_at: null,
  };
  return { ok: true, user };
}

export async function setUserRole(userId: string, role: UserRole) {
  const admin = await requireAdmin();
  if (admin.id === userId && role !== "admin") {
    return { error: "Você não pode remover seu próprio acesso de admin." };
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function resetUserPassword(userId: string, newPassword: string) {
  await requireAdmin();
  if (!newPassword || newPassword.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteUser(userId: string) {
  const profile = await requireAdmin();
  if (profile.id === userId) {
    return { error: "Você não pode remover a própria conta por aqui." };
  }
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  return { ok: true };
}
