"use client";

import { useMemo, useState } from "react";
import {
  MODE_HOURLY,
  MODE_UNIT,
  N_TECHS,
  PAY_FLAT,
  PAY_HOURLY,
  ROLE_OPTIONS,
  calculate,
  money,
  pctFmt,
  round2,
  type CalculationResult,
  type PayType,
  type PricingInputs,
  type PricingMode,
  type Role,
  type Technician,
  ValidationError,
} from "@/lib/pricing-engine";
import { createClient } from "@/lib/supabase/client";
import type { PricingPolicyRow, SalespersonRow, ServiceRuleRow, TeamMemberRow } from "@/lib/supabase/types";
import { PrintReport } from "./PrintReport";

const STEP_TITLES = ["Job & Mode", "Labor", "Materials", "Commercial", "Review"];
const NUMERIC_KEYS = new Set([
  "unitQuantity", "chemicals", "machine", "consumables", "water", "vehicle",
  "overhead", "commission", "targetProfit", "minCharge", "discount", "tax", "proposedPrice",
]);

interface TechnicianForm {
  name: string;
  role: Role;
  payType: PayType;
  estHours: string;
  actualHours: string;
  rate: string;
  flatAmount: string;
}
function emptyTechForm(): TechnicianForm {
  return { name: "", role: "Technician", payType: PAY_HOURLY, estHours: "", actualHours: "", rate: "", flatAmount: "" };
}

interface FormState {
  client: string;
  location: string;
  invoice: string;
  date: string;
  salesperson: string;
  service: string;
  pricingMode: PricingMode;
  unitLabel: string;
  unitQuantity: string;
  technicians: TechnicianForm[];
  chemicals: string;
  machine: string;
  consumables: string;
  water: string;
  vehicle: string;
  overhead: string;
  commission: string;
  targetProfit: string;
  minCharge: string;
  discount: string;
  tax: string;
  proposedPrice: string;
}

function num(s: string): number {
  return Number(s) || 0;
}

function collectInputs(f: FormState): PricingInputs {
  const technicians: Technician[] = f.technicians.map((t) => ({
    name: t.name,
    role: t.role,
    payType: t.payType,
    estHours: num(t.estHours),
    actualHours: num(t.actualHours),
    rate: num(t.rate),
    flatAmount: num(t.flatAmount),
  }));
  return {
    client: f.client, location: f.location, invoice: f.invoice, date: f.date, salesperson: f.salesperson,
    service: f.service, pricingMode: f.pricingMode, unitLabel: f.unitLabel || "unit", unitQuantity: num(f.unitQuantity),
    technicians,
    chemicals: num(f.chemicals), machine: num(f.machine), consumables: num(f.consumables), water: num(f.water), vehicle: num(f.vehicle),
    overhead: num(f.overhead) / 100, commission: num(f.commission) / 100, targetProfit: num(f.targetProfit) / 100,
    minCharge: num(f.minCharge), discount: num(f.discount) / 100, tax: num(f.tax) / 100,
    proposedPrice: f.proposedPrice ? num(f.proposedPrice) : null,
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  userId: string;
  policy: PricingPolicyRow | null;
  salespeople: SalespersonRow[];
  serviceRules: ServiceRuleRow[];
  teamMembers: TeamMemberRow[];
  clientNames: string[];
  salesNamesFromHistory: string[];
}

export function CalculatorWizard({ userId, policy, salespeople, serviceRules, teamMembers, clientNames, salesNamesFromHistory }: Props) {
  const [step, setStep] = useState(0);
  const [team, setTeam] = useState(teamMembers);
  const [clients, setClients] = useState(clientNames);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calcResult, setCalcResult] = useState<CalculationResult | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>(() => ({
    client: "", location: "", invoice: "", date: todayIso(),
    salesperson: "", service: serviceRules[0]?.service_name ?? "", pricingMode: MODE_HOURLY, unitLabel: "m2", unitQuantity: "",
    technicians: Array.from({ length: N_TECHS }, emptyTechForm),
    chemicals: "", machine: "", consumables: "", water: "", vehicle: "",
    overhead: String(policy?.overhead_pct ?? 12),
    commission: String(policy?.default_commission_pct ?? 10),
    targetProfit: String(policy?.target_profit_pct ?? 30),
    minCharge: String(policy?.minimum_charge ?? 350),
    discount: String(policy?.discount_pct ?? 0),
    tax: String(policy?.tax_pct ?? 0),
    proposedPrice: "",
  }));

  const salesNames = useMemo(
    () => Array.from(new Set([...salespeople.map((p) => p.name), ...salesNamesFromHistory])).sort(),
    [salespeople, salesNamesFromHistory]
  );

  function laborBenchmarkFor(service: string): number | null {
    const rule = serviceRules.find((r) => r.service_name === service);
    return rule ? rule.labor / 100 : null;
  }

  const liveResult = useMemo<CalculationResult | null>(() => {
    try {
      return calculate(collectInputs(form), laborBenchmarkFor(form.service));
    } catch {
      return null;
    }
  }, [form]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validateField(key: string, raw: string) {
    setErrors((prev) => {
      const next = { ...prev };
      const s = raw.trim();
      if (s === "") {
        delete next[key];
        return next;
      }
      const n = Number(s);
      if (Number.isNaN(n)) next[key] = "Enter a valid number";
      else if (n < 0) next[key] = "Cannot be negative";
      else delete next[key];
      return next;
    });
  }

  function onNumericChange(key: keyof FormState, value: string) {
    setField(key, value as FormState[typeof key]);
    if (NUMERIC_KEYS.has(key as string)) validateField(key as string, value);
  }

  function onSalespersonChange(value: string) {
    const match = salespeople.find((p) => p.name.trim().toLowerCase() === value.trim().toLowerCase());
    const pct = match ? match.commission_pct : policy?.default_commission_pct ?? 10;
    setForm((f) => ({ ...f, salesperson: value, commission: String(pct) }));
  }

  function onTechChange(i: number, patch: Partial<TechnicianForm>) {
    setForm((f) => {
      const technicians = f.technicians.slice();
      technicians[i] = { ...technicians[i], ...patch };
      return { ...f, technicians };
    });
  }

  function addTechnician() {
    setForm((f) => ({ ...f, technicians: [...f.technicians, emptyTechForm()] }));
  }

  function removeTechnician(i: number) {
    setForm((f) => ({ ...f, technicians: f.technicians.filter((_, idx) => idx !== i) }));
  }

  function onTechNameBlur(i: number) {
    const t = form.technicians[i];
    const info = team.find((m) => m.name.trim().toLowerCase() === t.name.trim().toLowerCase());
    if (!info) return;
    onTechChange(i, {
      role: t.role || (info.role as Role),
      rate: t.rate || (info.rate ? String(info.rate) : t.rate),
    });
  }

  async function upsertLearnedTeamRates(inputs: PricingInputs) {
    const supabase = createClient();
    const toUpsert = inputs.technicians.filter((t) => t.name.trim() && t.payType === PAY_HOURLY && t.rate > 0);
    for (const t of toUpsert) {
      const { data } = await supabase
        .from("team_members")
        .upsert({ name: t.name.trim(), role: t.role, rate: t.rate, updated_at: new Date().toISOString() }, { onConflict: "name" })
        .select()
        .single();
      if (data) {
        setTeam((prev) => {
          const filtered = prev.filter((m) => m.name.toLowerCase() !== data.name.toLowerCase());
          return [...filtered, data].sort((a, b) => a.name.localeCompare(b.name));
        });
      }
    }
  }

  function runCalculate(): CalculationResult | null {
    let r: CalculationResult;
    try {
      r = calculate(collectInputs(form), laborBenchmarkFor(form.service));
    } catch (e) {
      alert("Cannot calculate:\n\n" + (e instanceof ValidationError || e instanceof Error ? e.message : String(e)));
      return null;
    }
    setCalcResult(r);
    void upsertLearnedTeamRates(r.inputs);
    return r;
  }

  async function onSaveHistory() {
    const result = calcResult ?? runCalculate();
    if (!result) return;
    setSaving(true);
    const supabase = createClient();
    const inp = result.inputs;
    const { error } = await supabase.from("quotes").insert({
      created_by: userId,
      client: inp.client, location: inp.location, invoice: inp.invoice, service_date: inp.date || null,
      service: inp.service, pricing_mode: inp.pricingMode,
      labor_cost: result.laborCostTotal, direct_cost: result.directCost, dbs_price: result.dbsPrice,
      discount_pct: round2(inp.discount * 100), discount_amt: result.discountAmt,
      tax_pct: round2(inp.tax * 100), tax_amt: result.taxAmt, client_total: result.clientTotal,
      price_per_unit: result.pricePerUnit, overhead_pct: round2(inp.overhead * 100),
      commission_pct: round2(inp.commission * 100), commission_amt: result.commissionAmt,
      target_profit_pct: round2(inp.targetProfit * 100), profit_amt: result.profitAmt,
      margin_pct: round2(result.margin * 100), result_label: result.resultLabel,
      salesperson: inp.salesperson, efficiency_pct: result.efficiencyPct,
      technicians: inp.technicians, raw_inputs: inp,
    });
    setSaving(false);
    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }
    if (inp.client.trim() && !clients.includes(inp.client.trim())) {
      setClients((prev) => [...prev, inp.client.trim()].sort());
    }
    alert("Orçamento salvo no histórico.");
  }

  function onPrint() {
    const result = calcResult ?? runCalculate();
    if (!result) return;
    window.print();
  }

  return (
    <>
      <div className="top-price">
        <div>
          <div className="label">PRICE TO CHARGE THE CLIENT</div>
          <div className="value">{liveResult ? money(liveResult.clientTotal) : "Fill in the job and go to Review"}</div>
          <div className="sub">
            {liveResult &&
              [
                `DBS internal price: ${money(liveResult.dbsPrice)}`,
                liveResult.pricePerUnit !== null ? `${money(liveResult.pricePerUnit)} / ${form.unitLabel}` : null,
                liveResult.efficiencyPct !== null ? `Labor efficiency: ${liveResult.efficiencyPct.toFixed(1)}%` : null,
              ]
                .filter(Boolean)
                .join("   •   ")}
          </div>
        </div>
        <div className="live-box">
          <div className="lb-title">● Live preview</div>
          <div className="lb-sub">{liveResult ? "Calculation up to date" : "Updates automatically"}</div>
          {liveResult && (
            <span className="badge" style={{ background: liveResult.resultColor }}>
              {liveResult.resultLabel}
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <div className="steps">
          {STEP_TITLES.map((title, i) => (
            <span key={title} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button type="button" className="step-item" onClick={() => setStep(i)}>
                <span className={`step-circle${i === step ? " active" : i < step ? " done" : ""}`}>{i + 1}</span>
                <span className={`step-label${i === step ? " active" : i < step ? " done" : ""}`}>{title}</span>
              </button>
              {i < STEP_TITLES.length - 1 && <span className="step-line" />}
            </span>
          ))}
        </div>

        {step === 0 && (
          <StepJobMode
            form={form}
            errors={errors}
            clients={clients}
            salesNames={salesNames}
            serviceRules={serviceRules}
            onField={(k, v) => setField(k, v)}
            onSalesperson={onSalespersonChange}
            onNumeric={onNumericChange}
          />
        )}
        {step === 1 && (
          <StepLabor
            form={form}
            team={team}
            onTechChange={onTechChange}
            onTechNameBlur={onTechNameBlur}
            onAddTechnician={addTechnician}
            onRemoveTechnician={removeTechnician}
          />
        )}
        {step === 2 && <StepMaterials form={form} errors={errors} onNumeric={onNumericChange} />}
        {step === 3 && <StepCommercial form={form} errors={errors} onNumeric={onNumericChange} />}
        {step === 4 && (
          <StepReview
            calcResult={calcResult}
            saving={saving}
            onCalculate={runCalculate}
            onSave={onSaveHistory}
            onPrint={onPrint}
            serviceRules={serviceRules}
          />
        )}

        <div className="nav-row">
          <button className="btn btn-secondary" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            ‹ Back
          </button>
          {step < STEP_TITLES.length - 1 && (
            <button className="btn btn-primary" onClick={() => setStep((s) => Math.min(STEP_TITLES.length - 1, s + 1))}>
              Next ›
            </button>
          )}
        </div>
      </div>

      <div id="printReport">{calcResult && <PrintReport inputs={calcResult.inputs} result={calcResult} />}</div>
    </>
  );
}

// --------------------------------------------------------------------
// Step 1: Job & Mode
// --------------------------------------------------------------------
function StepJobMode({
  form,
  errors,
  clients,
  salesNames,
  serviceRules,
  onField,
  onSalesperson,
  onNumeric,
}: {
  form: FormState;
  errors: Record<string, string>;
  clients: string[];
  salesNames: string[];
  serviceRules: ServiceRuleRow[];
  onField: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  onSalesperson: (v: string) => void;
  onNumeric: (k: keyof FormState, v: string) => void;
}) {
  const rule = serviceRules.find((r) => r.service_name === form.service);
  return (
    <div>
      <div className="section-header">
        <div className="icon">▤</div>
        <div>
          <div className="title">Job information</div>
        </div>
      </div>
      <div className="field-grid">
        <div className="field">
          <label htmlFor="f_client">Client</label>
          <input id="f_client" type="text" list="clientNamesList" value={form.client} onChange={(e) => onField("client", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="f_salesperson">Salesperson</label>
          <input id="f_salesperson" type="text" list="salespersonNamesList" value={form.salesperson} onChange={(e) => onSalesperson(e.target.value)} />
          <div className="hint">used for the real commission</div>
        </div>
        <div className="field">
          <label htmlFor="f_location">Location</label>
          <input id="f_location" type="text" value={form.location} onChange={(e) => onField("location", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="f_service">Service category</label>
          <select id="f_service" value={form.service} onChange={(e) => onField("service", e.target.value)}>
            {serviceRules.map((r) => (
              <option key={r.service_name} value={r.service_name}>
                {r.service_name}
              </option>
            ))}
          </select>
          <div className="hint">{rule ? `Typical labor share: ${rule.labor}%` : ""}</div>
        </div>
        <div className="field">
          <label htmlFor="f_invoice">Invoice #</label>
          <input id="f_invoice" type="text" value={form.invoice} onChange={(e) => onField("invoice", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="f_date">Service date</label>
          <input id="f_date" type="date" value={form.date} onChange={(e) => onField("date", e.target.value)} />
        </div>
      </div>
      {rule && (
        <div className="note-box">
          <b>Pricing benchmark for {form.service}</b>
          <br />
          {[
            ["Labor", rule.labor], ["Chem.", rule.chemicals], ["Machine", rule.machine], ["Pads", rule.pads],
            ["Water", rule.water], ["Vehicle", rule.vehicle], ["Maint.", rule.maintenance], ["Deprec.", rule.depreciation],
            ["Admin", rule.admin], ["Comm.", rule.commission], ["Profit", rule.profit],
          ]
            .map(([label, v]) => `${label} ${v}%`)
            .join("   ")}
        </div>
      )}

      <div className="section-header" style={{ marginTop: 20 }}>
        <div className="icon">$</div>
        <div>
          <div className="title">Pricing mode</div>
        </div>
      </div>
      <div className="field-grid">
        <div className="field">
          <label>
            <input type="radio" name="pricingMode" checked={form.pricingMode === MODE_HOURLY} onChange={() => onField("pricingMode", MODE_HOURLY)} /> Hourly
            (time &amp; materials)
          </label>
        </div>
        <div className="field">
          <label>
            <input type="radio" name="pricingMode" checked={form.pricingMode === MODE_UNIT} onChange={() => onField("pricingMode", MODE_UNIT)} /> Per unit
            (m2 / window / room)
          </label>
        </div>
      </div>
      {form.pricingMode === MODE_UNIT && (
        <div className="field-grid">
          <div className="field">
            <label htmlFor="f_unitLabel">Unit label</label>
            <input id="f_unitLabel" type="text" value={form.unitLabel} onChange={(e) => onField("unitLabel", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="f_unitQuantity">Quantity</label>
            <input
              id="f_unitQuantity"
              type="number"
              className={errors.unitQuantity ? "invalid" : ""}
              value={form.unitQuantity}
              onChange={(e) => onNumeric("unitQuantity", e.target.value)}
            />
            <div className="field-error">{errors.unitQuantity || ""}</div>
          </div>
        </div>
      )}
      <div className="note-box">Cost is still built bottom-up from labor + materials. Per-unit mode only changes how the final price is quoted.</div>

      <datalist id="clientNamesList">
        {clients.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <datalist id="salespersonNamesList">
        {salesNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </div>
  );
}

// --------------------------------------------------------------------
// Step 2: Labor
// --------------------------------------------------------------------
function StepLabor({
  form,
  team,
  onTechChange,
  onTechNameBlur,
  onAddTechnician,
  onRemoveTechnician,
}: {
  form: FormState;
  team: TeamMemberRow[];
  onTechChange: (i: number, patch: Partial<TechnicianForm>) => void;
  onTechNameBlur: (i: number) => void;
  onAddTechnician: () => void;
  onRemoveTechnician: (i: number) => void;
}) {
  return (
    <div>
      <div className="section-header">
        <div className="icon">♟</div>
        <div>
          <div className="title">Labor</div>
          <div className="subtitle">{form.technicians.length} pessoa(s)</div>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="labor-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Pay type</th>
              <th>Est. h</th>
              <th>Actual h</th>
              <th>Rate $/h</th>
              <th>Flat $</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {form.technicians.map((t, i) => (
              <tr key={i}>
                <td>
                  <input
                    type="text"
                    list="teamNamesList"
                    style={{ width: 120 }}
                    value={t.name}
                    onChange={(e) => onTechChange(i, { name: e.target.value })}
                    onBlur={() => onTechNameBlur(i)}
                  />
                </td>
                <td>
                  <select value={t.role} onChange={(e) => onTechChange(i, { role: e.target.value as Role })}>
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select value={t.payType} onChange={(e) => onTechChange(i, { payType: e.target.value as PayType })}>
                    <option value={PAY_HOURLY}>{PAY_HOURLY}</option>
                    <option value={PAY_FLAT}>{PAY_FLAT}</option>
                  </select>
                </td>
                <td>
                  <input type="number" style={{ width: 64 }} value={t.estHours} onChange={(e) => onTechChange(i, { estHours: e.target.value })} />
                </td>
                <td>
                  <input type="number" style={{ width: 64 }} value={t.actualHours} onChange={(e) => onTechChange(i, { actualHours: e.target.value })} />
                </td>
                <td>
                  <input type="number" style={{ width: 70 }} value={t.rate} onChange={(e) => onTechChange(i, { rate: e.target.value })} />
                </td>
                <td>
                  <input type="number" style={{ width: 70 }} value={t.flatAmount} onChange={(e) => onTechChange(i, { flatAmount: e.target.value })} />
                </td>
                <td>
                  {form.technicians.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      onClick={() => onRemoveTechnician(i)}
                      title="Remover"
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="btn-row" style={{ marginTop: 10 }}>
        <button type="button" className="btn btn-secondary" onClick={onAddTechnician}>
          + Add technician
        </button>
      </div>
      <div className="note-box">Leave Actual h blank while quoting. For Flat pay, hours are optional and used only for efficiency tracking.</div>
      <datalist id="teamNamesList">
        {team.map((m) => (
          <option key={m.id} value={m.name} />
        ))}
      </datalist>
    </div>
  );
}

// --------------------------------------------------------------------
// Step 3: Materials
// --------------------------------------------------------------------
function StepMaterials({ form, errors, onNumeric }: { form: FormState; errors: Record<string, string>; onNumeric: (k: keyof FormState, v: string) => void }) {
  const fields: [keyof FormState, string][] = [
    ["chemicals", "Chemicals"], ["machine", "Machine / equipment"], ["consumables", "Consumables (pads/brushes)"],
    ["water", "Water"], ["vehicle", "Vehicle / travel"],
  ];
  return (
    <div>
      <div className="section-header">
        <div className="icon">▦</div>
        <div>
          <div className="title">Materials &amp; equipment</div>
          <div className="subtitle">Estimated direct job costs</div>
        </div>
      </div>
      <div className="field-grid">
        {fields.map(([key, label]) => (
          <div className="field" key={key}>
            <label htmlFor={`f_${key}`}>{label}</label>
            <input
              id={`f_${key}`}
              type="number"
              className={errors[key] ? "invalid" : ""}
              value={form[key] as string}
              onChange={(e) => onNumeric(key, e.target.value)}
            />
            <div className="field-error">{errors[key] || ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------
// Step 4: Commercial
// --------------------------------------------------------------------
function StepCommercial({ form, errors, onNumeric }: { form: FormState; errors: Record<string, string>; onNumeric: (k: keyof FormState, v: string) => void }) {
  const fields: [keyof FormState, string, string?][] = [
    ["overhead", "Overhead %", "admin, supervision, depreciation"],
    ["commission", "Commission %"],
    ["targetProfit", "Target profit %"],
    ["minCharge", "Minimum charge $"],
    ["discount", "Discount %"],
    ["tax", "Tax %"],
    ["proposedPrice", "Proposed price $ (optional)", "check a quote / client budget"],
  ];
  return (
    <div>
      <div className="section-header">
        <div className="icon">%</div>
        <div>
          <div className="title">Commercial parameters</div>
          <div className="subtitle">DBS policy defaults</div>
        </div>
      </div>
      <div className="field-grid">
        {fields.map(([key, label, hint]) => (
          <div className="field" key={key}>
            <label htmlFor={`f_${key}`}>{label}</label>
            <input
              id={`f_${key}`}
              type="number"
              className={errors[key] ? "invalid" : ""}
              value={form[key] as string}
              onChange={(e) => onNumeric(key, e.target.value)}
            />
            <div className="field-error">{errors[key] || ""}</div>
            {hint && <div className="hint">{hint}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------
// Step 5: Review
// --------------------------------------------------------------------
function StepReview({
  calcResult,
  saving,
  onCalculate,
  onSave,
  onPrint,
  serviceRules,
}: {
  calcResult: CalculationResult | null;
  saving: boolean;
  onCalculate: () => void;
  onSave: () => void;
  onPrint: () => void;
  serviceRules: ServiceRuleRow[];
}) {
  return (
    <div>
      <div className="btn-row">
        <button className="btn btn-primary" onClick={onCalculate}>
          Calculate
        </button>
        <button className="btn btn-secondary" onClick={onPrint}>
          Print / Save PDF
        </button>
        <button className="btn btn-secondary" disabled={saving} onClick={onSave}>
          {saving ? "Saving..." : "Save to history"}
        </button>
      </div>
      <div className="section-header">
        <div className="icon">✓</div>
        <div>
          <div className="title">Pricing breakdown</div>
        </div>
      </div>
      <pre className="breakdown">{calcResult ? renderBreakdown(calcResult, serviceRules) : "Click Calculate to see the full breakdown."}</pre>
    </div>
  );
}

function renderBreakdown(r: CalculationResult, serviceRules: ServiceRuleRow[]): string {
  const inp = r.inputs;
  const lines = [
    `Direct cost              ${money(r.directCost)}`,
    `Divisor                  ${r.divisor.toFixed(4)}`,
    `Formula price            ${money(r.recommendedPrice)}`,
    "",
    `DBS price                ${money(r.dbsPrice)}`,
    `  Direct cost           -${money(r.directCost)}`,
    `  Overhead              -${money(r.overheadAmt)}`,
    `  Commission            -${money(r.commissionAmt)}`,
    `Net profit               ${money(r.profitAmt)}`,
    `Margin                   ${pctFmt(r.margin)}`,
    "",
    "CLIENT INVOICE",
    `  DBS price              ${money(r.dbsPrice)}`,
    `  Discount (${pctFmt(inp.discount)})       -${money(r.discountAmt)}`,
    `  After discount         ${money(r.priceAfterDiscount)}`,
    `  Tax (${pctFmt(inp.tax)})            +${money(r.taxAmt)}`,
    `  TOTAL TO CHARGE        ${money(r.clientTotal)}`,
  ];
  lines.push("", `Result                   ${r.resultLabel}`, `Action                   ${r.resultAction}`);
  if (r.pricePerUnit !== null) lines.push(`  Price / ${inp.unitLabel.padEnd(10)}${money(r.pricePerUnit)}`);
  if (r.efficiencyPct !== null) {
    lines.push("", `Estimated hours          ${r.laborHoursEstTotal}`, `Actual hours             ${r.laborHoursActualTotal}`, `Efficiency               ${r.efficiencyPct.toFixed(1)}%`);
  }
  if (r.proposed) {
    lines.push(
      "", "PROPOSED PRICE CHECK",
      `  Price                  ${money(r.proposed.price)}`,
      `  Net profit             ${money(r.proposed.profitAmt)}`,
      `  Margin                 ${pctFmt(r.proposed.margin)}`,
      `  ${r.proposed.label}`
    );
  }
  const rule = serviceRules.find((sr) => sr.service_name === inp.service);
  if (rule) {
    lines.push(
      "", "SERVICE PRICING BENCHMARK",
      `  Service                 ${inp.service}`,
      `  Labor target            ${rule.labor}%`,
      `  Actual labor share      ${(r.clientTotal ? (r.laborCostTotal / r.clientTotal) * 100 : 0).toFixed(1)}%`,
      `  Commission target       ${rule.commission}%`,
      `  Actual commission       ${(inp.commission * 100).toFixed(1)}%`,
      `  Profit target           ${rule.profit}%`,
      `  Actual profit margin    ${(r.margin * 100).toFixed(1)}%`
    );
  }
  if (r.warnings.length) {
    lines.push("", "NOTES");
    r.warnings.forEach((w) => lines.push("• " + w));
  }
  return lines.join("\n");
}
