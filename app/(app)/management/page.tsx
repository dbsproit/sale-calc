import { requireProfile } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { ManagementTabs } from "@/components/management/ManagementTabs";
import type { PricingPolicyRow, SalespersonRow, ServiceRuleRow, TeamMemberRow } from "@/lib/supabase/types";
import { defaultServiceRuleRows } from "@/lib/service-rules";
import { listUsers } from "@/app/actions/users";

export default async function ManagementPage() {
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin";
  const supabase = await createClient();

  const [{ data: policy }, { data: salespeople }, { data: serviceRules }, { data: teamMembers }, users] = await Promise.all([
    supabase.from("pricing_policy").select("*").eq("id", 1).single(),
    supabase.from("salespeople").select("*").order("name"),
    supabase.from("service_rules").select("*").order("service_name"),
    supabase.from("team_members").select("*").order("name"),
    isAdmin ? listUsers() : Promise.resolve([]),
  ]);

  return (
    <ManagementTabs
      isAdmin={isAdmin}
      policy={
        (policy as PricingPolicyRow) ?? {
          id: 1, overhead_pct: 12, default_commission_pct: 10, target_profit_pct: 30,
          minimum_charge: 350, discount_pct: 0, tax_pct: 0, updated_at: "", updated_by: null,
        }
      }
      salespeople={(salespeople as SalespersonRow[]) ?? []}
      serviceRules={(serviceRules as ServiceRuleRow[])?.length ? (serviceRules as ServiceRuleRow[]) : defaultServiceRuleRows()}
      teamMembers={(teamMembers as TeamMemberRow[]) ?? []}
      users={users}
    />
  );
}
