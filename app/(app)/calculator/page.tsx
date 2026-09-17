import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { CalculatorWizard } from "@/components/calculator/CalculatorWizard";
import type { PricingPolicyRow, SalespersonRow, ServiceRuleRow, TeamMemberRow } from "@/lib/supabase/types";
import { DEFAULT_SERVICE_RULES } from "@/lib/pricing-engine";

export default async function CalculatorPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: policy }, { data: salespeople }, { data: serviceRules }, { data: teamMembers }, { data: recentQuotes }] =
    await Promise.all([
      supabase.from("pricing_policy").select("*").eq("id", 1).single(),
      supabase.from("salespeople").select("*").order("name"),
      supabase.from("service_rules").select("*"),
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
      serviceRules={(serviceRules as ServiceRuleRow[])?.length ? (serviceRules as ServiceRuleRow[]) : toServiceRuleRows(DEFAULT_SERVICE_RULES)}
      teamMembers={(teamMembers as TeamMemberRow[]) ?? []}
      clientNames={clientNames}
      salesNamesFromHistory={salesNamesFromHistory}
    />
  );
}

function toServiceRuleRows(defaults: typeof DEFAULT_SERVICE_RULES): ServiceRuleRow[] {
  return Object.entries(defaults).map(([service_name, r]) => ({
    id: service_name,
    service_name,
    ...r,
    updated_at: "",
  }));
}
