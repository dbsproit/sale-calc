"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (signInError) {
      setError("Email ou senha incorretos.");
      return;
    }
    router.replace("/calculator");
    router.refresh();
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <Image src="/logo.png" alt="DBS Building Services" width={299} height={73} className="brand-logo" priority />
        <div className="section-header" style={{ marginTop: 20 }}>
          <div>
            <div className="title">DBS Pricing Calculator</div>
            <div className="subtitle">Entre com sua conta para continuar</div>
          </div>
        </div>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="btn-row" style={{ marginTop: 20, marginBottom: 0 }}>
            <button type="submit" className="btn btn-primary" disabled={pending} style={{ width: "100%" }}>
              {pending ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
