// Tipos manuais que espelham supabase/schema.sql. Depois de rodar o schema no seu
// projeto, você pode substituir este arquivo por um gerado com:
//   npx supabase gen types typescript --project-id <seu-project-id> > lib/supabase/types.ts
//
// Usamos `type` (não `interface`) porque supabase-js exige que cada linha seja
// estruturalmente compatível com Record<string, unknown>, e interfaces não
// recebem esse índice implícito em TypeScript.

export type UserRole = "admin" | "user";

export type ProfileRow = {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
};

export type PricingPolicyRow = {
  id: number;
  overhead_pct: number;
  default_commission_pct: number;
  target_profit_pct: number;
  minimum_charge: number;
  discount_pct: number;
  tax_pct: number;
  updated_at: string;
  updated_by: string | null;
};

export type SalespersonRow = {
  id: string;
  name: string;
  commission_pct: number;
  created_at: string;
};

export type ServiceRuleRow = {
  id: string;
  service_name: string;
  labor: number;
  chemicals: number;
  machine: number;
  pads: number;
  water: number;
  vehicle: number;
  maintenance: number;
  depreciation: number;
  admin: number;
  commission: number;
  profit: number;
  updated_at: string;
};

export type TeamMemberRow = {
  id: string;
  name: string;
  role: string;
  rate: number;
  updated_at: string;
};

export type QuoteRow = {
  id: string;
  created_at: string;
  created_by: string | null;
  client: string | null;
  location: string | null;
  invoice: string | null;
  service_date: string | null;
  service: string | null;
  pricing_mode: string | null;
  labor_cost: number;
  direct_cost: number;
  dbs_price: number;
  discount_pct: number;
  discount_amt: number;
  tax_pct: number;
  tax_amt: number;
  client_total: number;
  price_per_unit: number | null;
  overhead_pct: number;
  commission_pct: number;
  commission_amt: number;
  target_profit_pct: number;
  profit_amt: number;
  margin_pct: number;
  result_label: string | null;
  salesperson: string | null;
  efficiency_pct: number | null;
  technicians: unknown;
  raw_inputs: unknown;
};

type Table<Row, Insert> = { Row: Row; Insert: Insert; Update: Partial<Row>; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, Partial<ProfileRow> & { id: string }>;
      pricing_policy: Table<PricingPolicyRow, Partial<PricingPolicyRow>>;
      salespeople: Table<SalespersonRow, Partial<SalespersonRow> & { name: string; commission_pct: number }>;
      service_rules: Table<ServiceRuleRow, Partial<ServiceRuleRow> & { service_name: string }>;
      team_members: Table<TeamMemberRow, Partial<TeamMemberRow> & { name: string }>;
      quotes: Table<QuoteRow, Partial<QuoteRow>>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
