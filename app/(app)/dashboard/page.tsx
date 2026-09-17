import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { DashboardStats } from "@/lib/supabase/types";

const BAND_COLORS: Record<string, string> = { GREEN: "#1E7F3C", YELLOW: "#B8860B", ORANGE: "#C05A00", RED: "#B00020" };

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
  // dashboard_stats() roda com SECURITY DEFINER no banco e devolve só os
  // agregados da equipe inteira - o histórico privado (RLS de quotes) não deixa
  // essa página enxergar as linhas de orçamento de quem não é dono/admin.
  const { data } = await supabase.rpc("dashboard_stats");
  const dash: DashboardStats = data ?? {
    totalJobs: 0, avgMargin: null, totalRevenue: 0,
    bandCounts: { GREEN: 0, YELLOW: 0, ORANGE: 0, RED: 0 },
    topClients: [], topSalespeople: [],
  };

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
            <div className="kpi-value">{dash.avgMargin !== null ? Number(dash.avgMargin).toFixed(1) + "%" : "-"}</div>
          </div>
          <div className="kpi-box">
            <div className="kpi-label">TOTAL REVENUE</div>
            <div className="kpi-value">${Number(dash.totalRevenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
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
