"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRow } from "@/lib/supabase/types";

const NAV_ITEMS = [
  { href: "/calculator", label: "▦ Calculator" },
  { href: "/history", label: "◷ History" },
  { href: "/dashboard", label: "▥ Dashboard" },
  { href: "/management", label: "⚙ Management" },
];

export function Sidebar({ profile }: { profile: ProfileRow }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="sidebar">
      <div className="brand">
        <Image src="/logo-light.png" alt="DBS Building Services" width={299} height={73} className="brand-logo" priority />
      </div>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-btn${pathname.startsWith(item.href) ? " active" : ""}`}
        >
          {item.label}
        </Link>
      ))}
      <div className="sidebar-footer">
        <div>{profile.full_name || "Usuário"} {profile.role === "admin" ? "(admin)" : ""}</div>
        <button
          type="button"
          onClick={handleSignOut}
          style={{ background: "none", border: "none", color: "#9FB0C3", fontSize: 11, cursor: "pointer", padding: 0, textDecoration: "underline" }}
        >
          Sair
        </button>
        <div style={{ marginTop: 6 }}>© 2026 DBS Building Services</div>
      </div>
    </div>
  );
}
