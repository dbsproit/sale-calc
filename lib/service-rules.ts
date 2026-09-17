import { DEFAULT_SERVICE_RULES } from "./pricing-engine";
import type { ServiceRuleRow } from "./supabase/types";

// Usado como fallback quando a tabela service_rules ainda está vazia (ex: logo
// após rodar o schema.sql pela primeira vez, antes do seed ter sido aplicado).
export function defaultServiceRuleRows(): ServiceRuleRow[] {
  return Object.entries(DEFAULT_SERVICE_RULES).map(([service_name, r]) => ({
    id: service_name,
    service_name,
    ...r,
    updated_at: "",
  }));
}
