import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { HistoryPageClient } from "@/components/history/HistoryPageClient";
import type { QuoteRow } from "@/lib/supabase/types";

export default async function HistoryPage() {
  await requireUser();
  const supabase = await createClient();
  const { data: quotes } = await supabase.from("quotes").select("*").order("created_at", { ascending: false }).limit(1000);

  return <HistoryPageClient initialQuotes={(quotes as QuoteRow[]) ?? []} />;
}
