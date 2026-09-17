"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { legacyTextToRows, HISTORY_HEADERS } from "@/lib/pricing-engine";
import type { QuoteRow } from "@/lib/supabase/types";

const COLUMNS: [keyof QuoteRow, string][] = [
  ["created_at", "Data"], ["client", "Cliente"], ["service", "Serviço"], ["pricing_mode", "Modo"],
  ["client_total", "Total cliente"], ["margin_pct", "Margem %"], ["result_label", "Resultado"], ["salesperson", "Vendedor"],
];

function quotesToLegacyText(rows: QuoteRow[]): string {
  const lines = rows.map((r) =>
    [
      r.created_at, r.client, r.location, r.invoice, r.service_date, r.service, r.pricing_mode,
      r.labor_cost, r.direct_cost, r.dbs_price, r.discount_pct, r.discount_amt, r.tax_pct, r.tax_amt,
      r.client_total, r.price_per_unit ?? "", r.overhead_pct, r.commission_pct, r.commission_amt,
      r.target_profit_pct, r.profit_amt, r.margin_pct, r.result_label, r.salesperson, r.efficiency_pct ?? "",
    ]
      .map((v) => String(v ?? ""))
      .join("|")
  );
  return [HISTORY_HEADERS.join("|"), ...lines].join("\n") + "\n";
}

export function HistoryPageClient({ initialQuotes }: { initialQuotes: QuoteRow[] }) {
  const [quotes, setQuotes] = useState(initialQuotes);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDownload() {
    const blob = new Blob([quotesToLegacyText(quotes)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "DBS_Pricing_History.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    try {
      const text = await file.text();
      const legacyRows = legacyTextToRows(text);
      if (!legacyRows.length) {
        alert("Nenhuma linha encontrada nesse arquivo.");
        return;
      }
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const payload = legacyRows.map((r) => ({
        created_by: user?.id ?? null,
        client: r.client, location: r.location, invoice: r.invoice, service_date: r.service_date || null,
        service: r.service, pricing_mode: r.pricing_mode,
        labor_cost: Number(r.labor_cost) || 0, direct_cost: Number(r.direct_cost) || 0, dbs_price: Number(r.dbs_price) || 0,
        discount_pct: Number(r.discount_pct) || 0, discount_amt: Number(r.discount_amt) || 0,
        tax_pct: Number(r.tax_pct) || 0, tax_amt: Number(r.tax_amt) || 0,
        client_total: Number(r.client_total) || 0, price_per_unit: r.price_per_unit ? Number(r.price_per_unit) : null,
        overhead_pct: Number(r.overhead_pct) || 0, commission_pct: Number(r.commission_pct) || 0, commission_amt: Number(r.commission_amt) || 0,
        target_profit_pct: Number(r.target_profit_pct) || 0, profit_amt: Number(r.profit_amt) || 0, margin_pct: Number(r.margin_pct) || 0,
        result_label: r.result_label, salesperson: r.salesperson, efficiency_pct: r.efficiency_pct ? Number(r.efficiency_pct) : null,
      }));
      const { data, error } = await supabase.from("quotes").insert(payload).select("*");
      if (error) {
        alert("Erro ao importar: " + error.message);
        return;
      }
      setQuotes((prev) => [...((data as QuoteRow[]) ?? []), ...prev]);
      alert(`${payload.length} orçamento(s) importado(s) para o banco.`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <>
      <h2>History</h2>
      <div className="card">
        <div className="section-header">
          <div className="icon">◷</div>
          <div>
            <div className="title">Quote history</div>
            <div className="subtitle">{quotes.length} orçamento(s) salvos no banco de dados</div>
          </div>
        </div>
        <div className="btn-row">
          <button className="btn btn-secondary" onClick={handleDownload}>
            Download history (.txt)
          </button>
          <button className="btn btn-secondary" disabled={importing} onClick={() => fileInputRef.current?.click()}>
            {importing ? "Importando..." : "Import legacy .txt"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFile(file);
            }}
          />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="hist-table">
            <thead>
              <tr>
                {COLUMNS.map(([key, label]) => (
                  <th key={key}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quotes.map((row) => (
                <tr key={row.id}>
                  {COLUMNS.map(([key]) => (
                    <td key={key}>{formatCell(key, row[key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function formatCell(key: keyof QuoteRow, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (key === "created_at") return new Date(String(value)).toLocaleString();
  if (key === "client_total") return `$${Number(value).toFixed(2)}`;
  if (key === "margin_pct") return `${Number(value).toFixed(1)}%`;
  return String(value);
}
