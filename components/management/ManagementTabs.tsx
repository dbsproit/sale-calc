"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_SERVICE_RULES, type ServiceRule } from "@/lib/pricing-engine";
import type { PricingPolicyRow, SalespersonRow, ServiceRuleRow, TeamMemberRow } from "@/lib/supabase/types";

const TABS = [
  { key: "policy", label: "Pricing Policy" },
  { key: "people", label: "Salespeople & Commission" },
  { key: "services", label: "Service Pricing Rules" },
  { key: "team", label: "Rate Card (Team)" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

interface Props {
  isAdmin: boolean;
  policy: PricingPolicyRow;
  salespeople: SalespersonRow[];
  serviceRules: ServiceRuleRow[];
  teamMembers: TeamMemberRow[];
}

export function ManagementTabs({ isAdmin, policy, salespeople, serviceRules, teamMembers }: Props) {
  const [tab, setTab] = useState<TabKey>("policy");

  return (
    <>
      <h2>Pricing Management</h2>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab-btn${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="card">
        {tab === "policy" && <PolicyTab isAdmin={isAdmin} initial={policy} />}
        {tab === "people" && <PeopleTab isAdmin={isAdmin} initial={salespeople} defaultCommission={policy.default_commission_pct} />}
        {tab === "services" && <ServicesTab isAdmin={isAdmin} initialRules={serviceRules} />}
        {tab === "team" && <TeamTab initial={teamMembers} />}
      </div>
    </>
  );
}

// --------------------------------------------------------------------
function PolicyTab({ isAdmin, initial }: { isAdmin: boolean; initial: PricingPolicyRow }) {
  const [form, setForm] = useState({
    overhead_pct: String(initial.overhead_pct),
    default_commission_pct: String(initial.default_commission_pct),
    target_profit_pct: String(initial.target_profit_pct),
    minimum_charge: String(initial.minimum_charge),
    discount_pct: String(initial.discount_pct),
    tax_pct: String(initial.tax_pct),
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const overhead = Number(form.overhead_pct);
    const commission = Number(form.default_commission_pct);
    const profit = Number(form.target_profit_pct);
    const min = Number(form.minimum_charge);
    const discount = Number(form.discount_pct);
    const tax = Number(form.tax_pct);
    if ([overhead, commission, profit, min, discount, tax].some(Number.isNaN)) {
      alert("All policy fields must be valid numbers.");
      return;
    }
    if (overhead < 0 || commission < 0 || profit < 0) {
      alert("Overhead, commission and target profit cannot be negative.");
      return;
    }
    if (overhead + commission + profit >= 100) {
      alert("Overhead + Commission + Target Profit must be less than 100%.");
      return;
    }
    if (min < 0) {
      alert("Minimum charge cannot be negative.");
      return;
    }
    if (discount < 0 || discount > 100 || tax < 0 || tax > 100) {
      alert("Discount and tax must be between 0% and 100%.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("pricing_policy").upsert({
      id: 1, overhead_pct: overhead, default_commission_pct: commission, target_profit_pct: profit,
      minimum_charge: min, discount_pct: discount, tax_pct: tax,
      updated_at: new Date().toISOString(), updated_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }
    alert("Pricing policy saved.");
  }

  const fields: [keyof typeof form, string][] = [
    ["overhead_pct", "Overhead %"], ["default_commission_pct", "Default commission %"], ["target_profit_pct", "Target profit %"],
    ["minimum_charge", "Minimum charge $"], ["discount_pct", "Default discount %"], ["tax_pct", "Default tax %"],
  ];

  return (
    <>
      <div className="section-header">
        <div>
          <div className="title">DBS Pricing Policy</div>
          <div className="subtitle">These values become the defaults for new quotes.</div>
        </div>
      </div>
      <div className="field-grid">
        {fields.map(([key, label]) => (
          <div className="field" key={key}>
            <label htmlFor={`p_${key}`}>{label}</label>
            <input
              id={`p_${key}`}
              type="number"
              disabled={!isAdmin}
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <div className="note-box">Salesperson-specific commission overrides the default commission.</div>
      {isAdmin ? (
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? "Saving..." : "Save Pricing Policy"}
          </button>
        </div>
      ) : (
        <div className="hint" style={{ marginTop: 14 }}>
          Somente administradores podem editar a política de preços.
        </div>
      )}
    </>
  );
}

// --------------------------------------------------------------------
function PeopleTab({ isAdmin, initial, defaultCommission }: { isAdmin: boolean; initial: SalespersonRow[]; defaultCommission: number }) {
  const [people, setPeople] = useState(initial);
  const [name, setName] = useState("");
  const [commission, setCommission] = useState(String(defaultCommission));
  const [armedId, setArmedId] = useState<string | null>(null);

  const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name));

  async function handleAdd() {
    const trimmed = name.trim();
    const pctValue = Number(commission);
    if (!trimmed) {
      alert("Enter the salesperson's name.");
      return;
    }
    if (Number.isNaN(pctValue) || pctValue < 0 || pctValue >= 100) {
      alert("Commission must be between 0% and less than 100%.");
      return;
    }
    const supabase = createClient();
    const existing = people.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      const { error } = await supabase.from("salespeople").update({ commission_pct: pctValue }).eq("id", existing.id);
      if (error) return alert("Erro: " + error.message);
      setPeople((prev) => prev.map((p) => (p.id === existing.id ? { ...p, commission_pct: pctValue } : p)));
    } else {
      const { data, error } = await supabase.from("salespeople").insert({ name: trimmed, commission_pct: pctValue }).select().single();
      if (error) return alert("Erro: " + error.message);
      setPeople((prev) => [...prev, data as SalespersonRow]);
    }
    setName("");
    setCommission(String(defaultCommission));
  }

  async function handleDelete(p: SalespersonRow) {
    if (armedId !== p.id) {
      setArmedId(p.id);
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from("salespeople").delete().eq("id", p.id);
    if (error) return alert("Erro: " + error.message);
    setPeople((prev) => prev.filter((x) => x.id !== p.id));
    setArmedId(null);
  }

  return (
    <>
      <div className="section-header">
        <div>
          <div className="title">Salespeople</div>
          <div className="subtitle">Commission percentage applied to each salesperson&apos;s quotes.</div>
        </div>
      </div>
      <div className="field-grid">
        <div className="field">
          <label htmlFor="sp_name">Name</label>
          <input id="sp_name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="sp_commission">Commission %</label>
          <input id="sp_commission" type="number" value={commission} onChange={(e) => setCommission(e.target.value)} />
        </div>
      </div>
      <div className="btn-row">
        <button className="btn btn-primary" onClick={handleAdd}>
          Add / Update
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => {
            setName("");
            setCommission(String(defaultCommission));
          }}
        >
          Clear
        </button>
      </div>
      <div className="hint" style={{ marginBottom: 8 }}>
        Click a row&apos;s &quot;Delete&quot; button to remove that salesperson (click once more to confirm).
      </div>
      <table className="hist-table">
        <thead>
          <tr>
            <th>Salesperson</th>
            <th>Commission %</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={3} className="hint">
                No salespeople added yet.
              </td>
            </tr>
          )}
          {sorted.map((p) => (
            <tr
              key={p.id}
              onClick={() => {
                setName(p.name);
                setCommission(String(p.commission_pct));
              }}
              style={{ cursor: "pointer" }}
            >
              <td>{p.name}</td>
              <td>{p.commission_pct}%</td>
              <td>
                <button
                  className="btn btn-secondary"
                  style={{
                    padding: "4px 10px", fontSize: 12,
                    ...(armedId === p.id ? { background: "var(--red)", color: "#fff", borderColor: "var(--red)" } : {}),
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDelete(p);
                  }}
                >
                  {armedId === p.id ? "Confirm?" : "Delete"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!isAdmin && <div className="hint" style={{ marginTop: 10 }}>Qualquer usuário logado pode gerenciar vendedores.</div>}
    </>
  );
}

// --------------------------------------------------------------------
const RULE_KEYS: [keyof ServiceRule, string][] = [
  ["labor", "Labor %"], ["chemicals", "Chemicals %"], ["machine", "Machine %"], ["pads", "Pads %"],
  ["water", "Water %"], ["vehicle", "Vehicle %"], ["maintenance", "Maintenance %"], ["depreciation", "Depreciation %"],
  ["admin", "Admin %"], ["commission", "Commission %"], ["profit", "Profit %"],
];

function emptyRule(): ServiceRule {
  return { labor: 0, chemicals: 0, machine: 0, pads: 0, water: 0, vehicle: 0, maintenance: 0, depreciation: 0, admin: 0, commission: 0, profit: 0 };
}

function ServicesTab({ isAdmin, initialRules }: { isAdmin: boolean; initialRules: ServiceRuleRow[] }) {
  const [services, setServices] = useState<string[]>(() => initialRules.map((r) => r.service_name));
  const [rules, setRules] = useState<Record<string, ServiceRule>>(() => {
    const map: Record<string, ServiceRule> = {};
    initialRules.forEach((r) => {
      map[r.service_name] = { labor: r.labor, chemicals: r.chemicals, machine: r.machine, pads: r.pads, water: r.water, vehicle: r.vehicle, maintenance: r.maintenance, depreciation: r.depreciation, admin: r.admin, commission: r.commission, profit: r.profit };
    });
    return map;
  });
  const [service, setService] = useState(services[0] ?? "");
  const [draft, setDraft] = useState<Record<string, string>>(() => toStringMap(rules[services[0]] ?? emptyRule()));
  const [saving, setSaving] = useState(false);
  const [armedDelete, setArmedDelete] = useState(false);
  const [newName, setNewName] = useState("");

  function toStringMap(r: ServiceRule): Record<string, string> {
    const m: Record<string, string> = {};
    RULE_KEYS.forEach(([k]) => (m[k] = String(r[k])));
    return m;
  }

  function switchService(name: string) {
    setService(name);
    setDraft(toStringMap(rules[name] ?? emptyRule()));
    setArmedDelete(false);
  }

  function handleAddService() {
    const trimmed = newName.trim();
    if (!trimmed) {
      alert("Digite um nome para a nova categoria de serviço.");
      return;
    }
    if (services.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      alert("Já existe uma categoria de serviço com esse nome.");
      return;
    }
    setServices((prev) => [...prev, trimmed]);
    setRules((prev) => ({ ...prev, [trimmed]: emptyRule() }));
    setService(trimmed);
    setDraft(toStringMap(emptyRule()));
    setNewName("");
  }

  async function handleDeleteService() {
    if (!armedDelete) {
      setArmedDelete(true);
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("service_rules").delete().eq("service_name", service);
    setSaving(false);
    if (error) {
      alert("Erro ao remover: " + error.message);
      return;
    }
    const remaining = services.filter((s) => s !== service);
    setServices(remaining);
    setRules((prev) => {
      const next = { ...prev };
      delete next[service];
      return next;
    });
    const nextService = remaining[0] ?? "";
    setService(nextService);
    setDraft(toStringMap(rules[nextService] ?? emptyRule()));
    setArmedDelete(false);
  }

  const total = RULE_KEYS.reduce((s, [k]) => s + (Number(draft[k]) || 0), 0);
  const profit = Number(draft.profit) || 0;
  const ok = Math.abs(total - 100) < 0.01;

  async function handleSave() {
    let hasErr = false;
    const rule = {} as ServiceRule;
    RULE_KEYS.forEach(([k]) => {
      const v = Number(draft[k]);
      if (Number.isNaN(v) || v < 0) hasErr = true;
      (rule as unknown as Record<string, number>)[k] = v;
    });
    if (hasErr) {
      alert("All service rule fields must be valid, non-negative numbers.");
      return;
    }
    if (!ok) {
      alert(`The service rule must total exactly 100%. Current total: ${total.toFixed(1)}%.`);
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("service_rules").upsert(
      { service_name: service, ...rule, updated_at: new Date().toISOString() },
      { onConflict: "service_name" }
    );
    setSaving(false);
    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }
    setRules((prev) => ({ ...prev, [service]: rule }));
    alert(`Pricing rule for ${service} saved.`);
  }

  function handleReset() {
    const def = DEFAULT_SERVICE_RULES[service];
    if (def) setDraft(toStringMap(def));
  }

  return (
    <>
      <div className="section-header">
        <div>
          <div className="title">Service Pricing Rules</div>
          <div className="subtitle">Benchmark allocations by service (must total 100%). Also controls the services offered in the Calculator.</div>
        </div>
      </div>
      {isAdmin && (
        <div className="field-grid" style={{ marginBottom: 4 }}>
          <div className="field">
            <label htmlFor="svc_new_name">Nova categoria de serviço</label>
            <input id="svc_new_name" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="ex: Pool Deck Cleaning" />
          </div>
          <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="button" className="btn btn-secondary" onClick={handleAddService}>
              + Add service
            </button>
          </div>
        </div>
      )}
      <div className="field">
        <label htmlFor="svc_select">Service</label>
        <select id="svc_select" value={service} onChange={(e) => switchService(e.target.value)}>
          {services.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="field-grid">
        {RULE_KEYS.map(([key, label]) => (
          <div className="field" key={key}>
            <label htmlFor={`rk_${key}`}>{label}</label>
            <input
              id={`rk_${key}`}
              type="number"
              disabled={!isAdmin}
              value={draft[key]}
              onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <div className="rule-total" style={{ color: ok ? "#127A43" : "var(--red)" }}>
        Cost allocation: {(total - profit).toFixed(0)}%   •   Profit: {profit}%   •   Total: {total.toFixed(0)}%   {ok ? "✓" : "⚠ Must equal 100%"}
      </div>
      {isAdmin ? (
        <div className="btn-row" style={{ marginTop: 10 }}>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? "Saving..." : "Save Service Rule"}
          </button>
          {DEFAULT_SERVICE_RULES[service] && (
            <button className="btn btn-secondary" onClick={handleReset}>
              Reset to Reference
            </button>
          )}
          {services.length > 1 && (
            <button
              className="btn btn-secondary"
              disabled={saving}
              onClick={handleDeleteService}
              style={armedDelete ? { background: "var(--red)", color: "#fff", borderColor: "var(--red)" } : undefined}
            >
              {armedDelete ? "Confirm remove?" : "Remove service"}
            </button>
          )}
        </div>
      ) : (
        <div className="hint" style={{ marginTop: 10 }}>
          Somente administradores podem editar as regras de precificação por serviço.
        </div>
      )}
    </>
  );
}

// --------------------------------------------------------------------
function TeamTab({ initial }: { initial: TeamMemberRow[] }) {
  const [team, setTeam] = useState(initial);

  async function handleRemove(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) return alert("Erro: " + error.message);
    setTeam((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <>
      <div className="section-header">
        <div>
          <div className="title">Rate Card (Team)</div>
          <div className="subtitle">Learned automatically from Hourly technicians entered in the Calculator. Used to auto-fill Name/Rate in the Labor step.</div>
        </div>
      </div>
      <table className="hist-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Rate $/h</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {team.map((m) => (
            <tr key={m.id}>
              <td>{m.name}</td>
              <td>{m.role}</td>
              <td>${Number(m.rate).toFixed(2)}</td>
              <td>
                <button className="btn btn-secondary" style={{ padding: "4px 10px" }} onClick={() => void handleRemove(m.id)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
