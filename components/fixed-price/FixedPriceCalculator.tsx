"use client";

import { useMemo, useState } from "react";
import { calculateFixedPrice, money, pctFmt } from "@/lib/pricing-engine";

interface FormState {
  fixedValue: string;
  hourlyCost: string;
  additionalCosts: string;
  desiredMargin: string;
  hours: string;
}

const DEFAULTS: FormState = {
  fixedValue: "1500",
  hourlyCost: "30",
  additionalCosts: "200",
  desiredMargin: "20",
  hours: "20",
};

function num(s: string): number {
  return Number(s) || 0;
}

export function FixedPriceCalculator() {
  const [form, setForm] = useState<FormState>(DEFAULTS);

  function setField(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const result = useMemo(
    () =>
      calculateFixedPrice({
        fixedValue: num(form.fixedValue),
        hourlyCost: num(form.hourlyCost),
        additionalCosts: num(form.additionalCosts),
        desiredMarginPct: num(form.desiredMargin) / 100,
        hours: num(form.hours),
      }),
    [form]
  );

  const sliderMax = Math.max(20, Math.ceil(result.maxHoursBreakeven * 1.2), Math.ceil(num(form.hours) * 1.2));

  return (
    <>
      <div className="top-price">
        <div>
          <div className="label">MAX HOURS WITHOUT LOSS</div>
          <div className="value">{result.maxHoursBreakeven.toFixed(1)}h</div>
          <div className="sub">Recommended to hit your target margin: {result.maxHoursRecommended.toFixed(1)}h</div>
        </div>
        <div className="live-box">
          <div className="lb-title">● Live preview</div>
          <div className="lb-sub">At {num(form.hours).toFixed(1)}h of execution</div>
          <span className="badge" style={{ background: result.statusColor }}>
            {result.statusLabel}
          </span>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div className="icon">$</div>
          <div>
            <div className="title">Fixed price job</div>
            <div className="subtitle">Set the deal terms, then drag the hours slider below to simulate</div>
          </div>
        </div>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="fp_fixedValue">Fixed service value $</label>
            <input id="fp_fixedValue" type="number" value={form.fixedValue} onChange={(e) => setField("fixedValue", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="fp_hourlyCost">Team cost $/hour</label>
            <input id="fp_hourlyCost" type="number" value={form.hourlyCost} onChange={(e) => setField("hourlyCost", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="fp_additionalCosts">Additional costs $</label>
            <input id="fp_additionalCosts" type="number" value={form.additionalCosts} onChange={(e) => setField("additionalCosts", e.target.value)} />
            <div className="hint">Materials, chemicals, travel - anything besides labor</div>
          </div>
          <div className="field">
            <label htmlFor="fp_desiredMargin">Desired profit margin %</label>
            <input id="fp_desiredMargin" type="number" value={form.desiredMargin} onChange={(e) => setField("desiredMargin", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div className="icon">⏱</div>
          <div>
            <div className="title">Execution hours</div>
            <div className="subtitle">How many hours will the team actually spend on this job?</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <input
            type="range"
            min={0}
            max={sliderMax}
            step={0.5}
            value={num(form.hours)}
            onChange={(e) => setField("hours", e.target.value)}
            style={{ flex: 1 }}
          />
          <input
            type="number"
            value={form.hours}
            onChange={(e) => setField("hours", e.target.value)}
            style={{ width: 90, flexShrink: 0 }}
          />
        </div>
        <div className="hint" style={{ marginTop: 8 }}>
          Breakeven at {result.maxHoursBreakeven.toFixed(1)}h · target margin reached up to {result.maxHoursRecommended.toFixed(1)}h
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div className="icon">✓</div>
          <div>
            <div className="title">Result at {num(form.hours).toFixed(1)}h</div>
          </div>
        </div>
        <div className="kpi-row">
          <div className="kpi-box">
            <div className="kpi-label">LABOR COST</div>
            <div className="kpi-value">{money(result.laborCost)}</div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">TOTAL SERVICE COST</div>
            <div className="kpi-value">{money(result.totalCost)}</div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">ESTIMATED PROFIT</div>
            <div className="kpi-value" style={{ color: result.statusColor }}>
              {money(result.profit)}
            </div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">PROFIT MARGIN</div>
            <div className="kpi-value" style={{ color: result.statusColor }}>
              {pctFmt(result.marginPct)}
            </div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">REMAINING VALUE</div>
            <div className="kpi-value">{money(result.remainingValue)}</div>
          </div>
        </div>
        <pre className="breakdown">
          {[
            `Fixed service value      ${money(num(form.fixedValue))}`,
            `Team cost                ${money(num(form.hourlyCost))}/h`,
            `Hours entered            ${num(form.hours).toFixed(1)}h`,
            "",
            `Labor cost               ${money(result.laborCost)}`,
            `Additional costs         ${money(num(form.additionalCosts))}`,
            `Total service cost       ${money(result.totalCost)}`,
            "",
            `Estimated profit         ${money(result.profit)}`,
            `Profit margin            ${pctFmt(result.marginPct)}`,
            `Remaining value          ${money(result.remainingValue)}`,
            "",
            `Max hours without loss           ${result.maxHoursBreakeven.toFixed(1)}h`,
            `Max hours at ${num(form.desiredMargin).toFixed(0)}% target margin      ${result.maxHoursRecommended.toFixed(1)}h`,
            "",
            `Result: ${result.statusLabel}`,
          ].join("\n")}
        </pre>
      </div>
    </>
  );
}
