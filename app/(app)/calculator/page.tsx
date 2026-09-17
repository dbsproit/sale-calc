import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { CalculatorWizard } from "@/components/calculator/CalculatorWizard";
import type { PricingPolicyRow, SalespersonRow, ServiceRuleRow, TeamMemberRow } from "@/lib/supabase/types";
import { defaultServiceRuleRows } from "@/lib/service-rules";

export default async function CalculatorPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: policy }, { data: salespeople }, { data: serviceRules }, { data: teamMembers }, { data: recentQuotes }] =
    await Promise.all([
      supabase.from("pricing_policy").select("*").eq("id", 1).single(),
      supabase.from("salespeople").select("*").order("name"),
      supabase.from("service_rules").select("*").order("service_name"),
      supabase.from("team_members").select("*").order("name"),
      supabase.from("quotes").select("client, salesperson").order("created_at", { ascending: false }).limit(500),
    ]);

  const clientNames = Array.from(new Set((recentQuotes ?? []).map((r) => (r.client || "").trim()).filter(Boolean))).sort();
  const salesNamesFromHistory = Array.from(new Set((recentQuotes ?? []).map((r) => (r.salesperson || "").trim()).filter(Boolean)));

  return (
    <CalculatorWizard
      userId={user.id}
      policy={(policy as PricingPolicyRow) ?? null}
      salespeople={(salespeople as SalespersonRow[]) ?? []}
      serviceRules={(serviceRules as ServiceRuleRow[])?.length ? (serviceRules as ServiceRuleRow[]) : defaultServiceRuleRows()}
      teamMembers={(teamMembers as TeamMemberRow[]) ?? []}
      clientNames={clientNames}
      salesNamesFromHistory={salesNamesFromHistory}
    />
  );
}
