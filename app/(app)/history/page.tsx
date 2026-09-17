import { requireProfile } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { HistoryPageClient } from "@/components/history/HistoryPageClient";
import type { QuoteRow } from "@/lib/supabase/types";

export default async function HistoryPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  // RLS já filtra: usuário comum só recebe os próprios orçamentos, admin recebe todos.
  const { data: quotes } = await supabase.from("quotes").select("*").order("created_at", { ascending: false }).limit(1000);

  return <HistoryPageClient initialQuotes={(quotes as QuoteRow[]) ?? []} isAdmin={profile.role === "admin"} />;
}
