"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRow } from "@/lib/supabase/types";

export function SettingsForm({ profile }: { profile: ProfileRow }) {
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [savingName, setSavingName] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleSaveName() {
    setSavingName(true);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", profile.id);
    setSavingName(false);
    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }
    alert("Nome atualizado.");
  }

  async function handleChangePassword() {
    if (newPassword.length < 6) {
      alert("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("As senhas não coincidem.");
      return;
    }
    setSavingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      alert("Erro ao trocar senha: " + error.message);
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    alert("Senha alterada com sucesso.");
  }

  return (
    <>
      <h2>Settings</h2>

      <div className="card">
        <div className="section-header">
          <div>
            <div className="title">Sua conta</div>
            <div className="subtitle">{profile.role === "admin" ? "Administrador" : "Usuário"}</div>
          </div>
        </div>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="s_name">Nome</label>
            <input id="s_name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
        </div>
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn btn-primary" disabled={savingName} onClick={handleSaveName}>
            {savingName ? "Salvando..." : "Save name"}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <div className="title">Trocar senha</div>
          </div>
        </div>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="s_new_password">Nova senha</label>
            <input id="s_new_password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="s_confirm_password">Confirmar nova senha</label>
            <input id="s_confirm_password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
        </div>
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn btn-primary" disabled={savingPassword} onClick={handleChangePassword}>
            {savingPassword ? "Salvando..." : "Change password"}
          </button>
        </div>
      </div>
    </>
  );
}
