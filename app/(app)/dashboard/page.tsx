import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { QuoteRow } from "@/lib/supabase/types";

const BAND_COLORS: Record<string, string> = { GREEN: "#1E7F3C", YELLOW: "#B8860B", ORANGE: "#C05A00", RED: "#B00020" };

function computeDashboard(rows: QuoteRow[]) {
  if (!rows.length) {
    return { totalJobs: 0, avgMargin: null as number | null, totalRevenue: 0, bandCounts: { GREEN: 0, YELLOW: 0, ORANGE: 0, RED: 0 }, topClients: [] as [string, number][], topSalespeople: [] as [string, number][] };
  }
  const margins = rows.map((r) => Number(r.margin_pct) || 0);
  const avgMargin = margins.reduce((a, b) => a + b, 0) / margins.length;
  const totalRevenue = rows.reduce((s, r) => s + (Number(r.client_total) || 0), 0);
  const bandCounts = { GREEN: 0, YELLOW: 0, ORANGE: 0, RED: 0 };
  rows.forEach((r) => {
    const label = (r.result_label || "").toUpperCase();
    for (const band of Object.keys(bandCounts) as (keyof typeof bandCounts)[]) {
      if (label.startsWith(band)) {
        bandCounts[band]++;
        break;
      }
    }
  });
  const revenueByClient: Record<string, number> = {};
  rows.forEach((r) => {
    const c = (r.client || "").trim() || "(no client name)";
    revenueByClient[c] = (revenueByClient[c] || 0) + (Number(r.client_total) || 0);
  });
  const topClients = Object.entries(revenueByClient).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const commissionBySales: Record<string, number> = {};
  rows.forEach((r) => {
    const s = (r.salesperson || "").trim();
    if (!s) return;
    commissionBySales[s] = (commissionBySales[s] || 0) + (Number(r.commission_amt) || 0);
  });
  const topSalespeople = Object.entries(commissionBySales).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return { totalJobs: rows.length, avgMargin, totalRevenue, bandCounts, topClients, topSalespeople };
}

function Bars({ data, colorMap }: { data: [string, number][]; colorMap?: Record<string, string> }) {
  if (!data.length) return <div className="hint">No data yet.</div>;
  const max = Math.max(...data.map((d) => d[1]), 1);
  return (
    <>
      {data.map(([label, val]) => {
        const color = colorMap?.[label.toUpperCase()] || "var(--accent)";
        const w = Math.max((val / max) * 100, 3);
        return (
          <div className="bar-row" key={label}>
            <div className="bar-label">{label}</div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${w}%`, background: color }} />
            </div>
            <div className="bar-value">{val.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
        );
      })}
    </>
  );
}

export default async function DashboardPage() {
  await requireUser();
  const supabase = await createClient();
  const { data: quotes } = await supabase.from("quotes").select("*").order("created_at", { ascending: false }).limit(2000);
  const dash = computeDashboard((quotes as QuoteRow[]) ?? []);

  return (
    <>
      <h2>Dashboard</h2>
      <div className="card">
        <div className="kpi-row">
          <div className="kpi-box">
            <div className="kpi-label">TOTAL QUOTES SAVED</div>
            <div className="kpi-value">{dash.totalJobs}</div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">AVERAGE MARGIN</div>
            <div className="kpi-value">{dash.avgMargin !== null ? dash.avgMargin.toFixed(1) + "%" : "-"}</div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">TOTAL REVENUE</div>
            <div className="kpi-value">${dash.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
        </div>
        <div className="dash-cols">
          <div className="bars-col">
            <div className="section-header">
              <div className="title">Jobs by margin band</div>
            </div>
            <Bars data={Object.entries(dash.bandCounts)} colorMap={BAND_COLORS} />
          </div>
          <div className="bars-col">
            <div className="section-header">
              <div className="title">Top clients by revenue</div>
            </div>
            <Bars data={dash.topClients} />
          </div>
          <div className="bars-col">
            <div className="section-header">
              <div className="title">Top salespeople by commission</div>
            </div>
            <Bars data={dash.topSalespeople} />
          </div>
        </div>
      </div>
    </>
  );
}
