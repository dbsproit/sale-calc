// Motor de precificação - porta 1:1 das fórmulas do Calc.html original.
// Qualquer alteração aqui muda o preço cobrado do cliente: mantenha as fórmulas idênticas.

export const PAY_HOURLY = "Hourly" as const;
export const PAY_FLAT = "Flat" as const;
export type PayType = typeof PAY_HOURLY | typeof PAY_FLAT;

export const MODE_HOURLY = "Hourly (time & materials)" as const;
export const MODE_UNIT = "Per unit (m2 / window / room)" as const;
export type PricingMode = typeof MODE_HOURLY | typeof MODE_UNIT;

export const ROLE_OPTIONS = ["Technician", "Helper"] as const;
export type Role = (typeof ROLE_OPTIONS)[number];

export const N_TECHS = 4;

export const SERVICE_LABOR_SHARE: Record<string, number> = {
  "Grout / Tile / Steam": 0.38,
  "Carpet Cleaning": 0.35,
  "Floor Stripping & Waxing": 0.32,
  "Floor Scrub / Auto-Scrub": 0.35,
  "Window Cleaning": 0.4,
  "Pressure Washing": 0.32,
  "Deep Cleaning": 0.4,
  "Upholstery / Chair": 0.38,
  "Grout Restoration": 0.4,
  "Specialty / Other": 0.37,
};

export interface ServiceRule {
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
}

export const DEFAULT_SERVICE_RULES: Record<string, ServiceRule> = {
  "Grout / Tile / Steam": { labor: 38, chemicals: 4, machine: 4, pads: 2, water: 1, vehicle: 3, maintenance: 2, depreciation: 2, admin: 4, commission: 10, profit: 30 },
  "Carpet Cleaning": { labor: 35, chemicals: 5, machine: 5, pads: 1, water: 1, vehicle: 3, maintenance: 2, depreciation: 3, admin: 5, commission: 10, profit: 30 },
  "Floor Stripping & Waxing": { labor: 32, chemicals: 8, machine: 4, pads: 3, water: 1, vehicle: 3, maintenance: 2, depreciation: 3, admin: 4, commission: 10, profit: 30 },
  "Floor Scrub / Auto-Scrub": { labor: 35, chemicals: 5, machine: 5, pads: 2, water: 1, vehicle: 3, maintenance: 2, depreciation: 2, admin: 5, commission: 10, profit: 30 },
  "Window Cleaning": { labor: 40, chemicals: 3, machine: 2, pads: 1, water: 1, vehicle: 4, maintenance: 2, depreciation: 2, admin: 5, commission: 10, profit: 30 },
  "Pressure Washing": { labor: 32, chemicals: 3, machine: 7, pads: 0, water: 4, vehicle: 4, maintenance: 3, depreciation: 4, admin: 3, commission: 10, profit: 30 },
  "Deep Cleaning": { labor: 40, chemicals: 6, machine: 2, pads: 1, water: 1, vehicle: 3, maintenance: 1, depreciation: 1, admin: 5, commission: 10, profit: 30 },
  "Upholstery / Chair": { labor: 38, chemicals: 5, machine: 4, pads: 1, water: 1, vehicle: 3, maintenance: 2, depreciation: 2, admin: 4, commission: 10, profit: 30 },
  "Grout Restoration": { labor: 40, chemicals: 5, machine: 3, pads: 2, water: 1, vehicle: 3, maintenance: 2, depreciation: 2, admin: 2, commission: 10, profit: 30 },
  "Specialty / Other": { labor: 37, chemicals: 5, machine: 4, pads: 2, water: 1, vehicle: 3, maintenance: 2, depreciation: 2, admin: 4, commission: 10, profit: 30 },
};

export interface Technician {
  name: string;
  role: Role;
  payType: PayType;
  estHours: number;
  actualHours: number;
  rate: number;
  flatAmount: number;
}

export function emptyTechnician(): Technician {
  return { name: "", role: "Technician", payType: PAY_HOURLY, estHours: 0, actualHours: 0, rate: 0, flatAmount: 0 };
}

export interface PricingInputs {
  client: string;
  location: string;
  invoice: string;
  date: string;
  salesperson: string;
  service: string;
  pricingMode: PricingMode;
  unitLabel: string;
  unitQuantity: number;
  technicians: Technician[];
  chemicals: number;
  machine: number;
  consumables: number;
  water: number;
  vehicle: number;
  overhead: number; // fração (0.12 = 12%)
  commission: number;
  targetProfit: number;
  minCharge: number;
  discount: number;
  tax: number;
  proposedPrice: number | null;
}

export interface PriceEvaluation {
  price: number;
  overheadAmt: number;
  commissionAmt: number;
  totalCost: number;
  profitAmt: number;
  margin: number;
  label: string;
  color: string;
  action: string;
}

export interface CalculationResult {
  inputs: PricingInputs;
  directCost: number;
  divisor: number;
  recommendedPrice: number;
  belowMinimum: boolean;
  dbsPrice: number;
  discountAmt: number;
  priceAfterDiscount: number;
  taxAmt: number;
  clientTotal: number;
  pricePerUnit: number | null;
  overheadAmt: number;
  commissionAmt: number;
  totalCost: number;
  profitAmt: number;
  margin: number;
  resultLabel: string;
  resultColor: string;
  resultAction: string;
  proposed: PriceEvaluation | null;
  warnings: string[];
  laborCostTotal: number;
  laborHoursEstTotal: number;
  laborHoursActualTotal: number;
  efficiencyPct: number | null;
}

export class ValidationError extends Error {
  errors: string[];
  constructor(errors: string[]) {
    super(errors.join("\n"));
    this.errors = errors;
  }
}

export function round2(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}
export function round1(x: number): number {
  return Math.round((x + Number.EPSILON) * 10) / 10;
}
export function round4(x: number): number {
  return Math.round((x + Number.EPSILON) * 10000) / 10000;
}

export function technicianCost(t: Technician): number {
  if (t.payType === PAY_FLAT) return round2(t.flatAmount || 0);
  const billed = (t.actualHours || 0) > 0 ? t.actualHours : t.estHours || 0;
  const rate = t.rate || 0;
  if (billed <= 0 || rate <= 0) return 0;
  return round2(billed * rate);
}
export function laborCost(techs: Technician[]): number {
  return round2(techs.reduce((s, t) => s + technicianCost(t), 0));
}
export function laborHoursEst(techs: Technician[]): number {
  return round2(techs.reduce((s, t) => s + (t.estHours || 0), 0));
}
export function laborHoursActual(techs: Technician[]): number {
  return round2(techs.filter((t) => (t.actualHours || 0) > 0).reduce((s, t) => s + t.actualHours, 0));
}
export function hasActualHours(techs: Technician[]): boolean {
  return techs.some((t) => (t.actualHours || 0) > 0);
}
export function efficiency(techs: Technician[]): number | null {
  const actual = laborHoursActual(techs);
  if (actual <= 0) return null;
  const est = laborHoursEst(techs);
  if (est <= 0) return null;
  return round1((est / actual) * 100);
}
export function directCost(inp: PricingInputs): number {
  return round2(laborCost(inp.technicians) + inp.chemicals + inp.machine + inp.consumables + inp.water + inp.vehicle);
}
export function laborShareActual(inp: PricingInputs): number | null {
  const dc = directCost(inp);
  if (dc <= 0) return null;
  return round4(laborCost(inp.technicians) / dc);
}

export function classify(margin: number): { label: string; color: string; action: string } {
  if (margin >= 0.3) return { label: "GREEN - Profitable", color: "#1E7F3C", action: "At or above target. No action required." };
  if (margin >= 0.25) return { label: "YELLOW - Watch", color: "#B8860B", action: "Below target. Manager reviews why." };
  if (margin >= 0.15) return { label: "ORANGE - Problem", color: "#C05A00", action: "Management approval before repeating this price." };
  if (margin >= 0.0) return { label: "RED - Serious", color: "#B00020", action: "Root-cause required before quoting like this again." };
  return { label: "RED - LOSS", color: "#B00020", action: "DBS loses money at this price. Do not accept." };
}

export function evaluatePrice(price: number, dc: number, overhead: number, commission: number): PriceEvaluation {
  const overheadAmt = round2(price * overhead);
  const commissionAmt = round2(price * commission);
  const totalCost = round2(dc + overheadAmt + commissionAmt);
  const profitAmt = round2(price - totalCost);
  const margin = price ? profitAmt / price : 0;
  const c = classify(margin);
  return { price: round2(price), overheadAmt, commissionAmt, totalCost, profitAmt, margin, label: c.label, color: c.color, action: c.action };
}

export function validateInputs(inp: PricingInputs): string[] {
  const errors: string[] = [];
  const numericFields: [string, number][] = [
    ["Chemicals", inp.chemicals],
    ["Machine / equipment", inp.machine],
    ["Consumables", inp.consumables],
    ["Water", inp.water],
    ["Vehicle / travel", inp.vehicle],
    ["Minimum charge", inp.minCharge],
    ["Unit quantity", inp.unitQuantity],
  ];
  for (const [label, value] of numericFields) if (value < 0) errors.push(`'${label}' cannot be negative.`);

  inp.technicians.forEach((t, i) => {
    const idx = i + 1;
    const isEmpty = t.estHours <= 0 && t.actualHours <= 0 && t.rate <= 0 && t.flatAmount <= 0 && !(t.name || "").trim();
    if (isEmpty) return;
    const hasNeg = t.estHours < 0 || t.actualHours < 0 || t.rate < 0 || t.flatAmount < 0;
    if (hasNeg) {
      errors.push(`Person #${idx}: hours, rate and flat amount cannot be negative.`);
      return;
    }
    if (t.payType === PAY_FLAT) {
      if (t.flatAmount <= 0) errors.push(`Person #${idx}: 'Flat' pay selected but no flat amount was entered.`);
    } else {
      if (t.rate > 0 && t.estHours <= 0 && t.actualHours <= 0) errors.push(`Person #${idx}: rate ($/h) was entered but no hours were entered.`);
      if ((t.estHours > 0 || t.actualHours > 0) && t.rate <= 0) errors.push(`Person #${idx}: hours were entered but no rate ($/h) was entered.`);
    }
  });

  if (inp.overhead < 0 || inp.commission < 0 || inp.targetProfit < 0) errors.push("Overhead, Commission and Target Profit cannot be negative.");
  if (inp.overhead + inp.commission + inp.targetProfit >= 1.0) errors.push("Overhead + Commission + Target Profit add up to 100% or more - impossible to calculate a price. Reduce the percentages.");
  if (inp.tax < 0 || inp.tax > 1) errors.push("Tax (%) must be between 0% and 100%.");
  if (inp.discount < 0 || inp.discount > 1) errors.push("Discount (%) must be between 0% and 100%.");
  if (inp.pricingMode === MODE_UNIT && inp.unitQuantity <= 0) errors.push("'Per unit' mode selected: enter a quantity of units (m2 / windows / rooms) greater than zero.");
  if (directCost(inp) <= 0) errors.push("Direct cost is zero. Enter at least labor (hours + rate, or a flat amount, for 1 person) or some materials cost.");
  return errors;
}

export function calculate(inp: PricingInputs): CalculationResult {
  const errors = validateInputs(inp);
  if (errors.length) throw new ValidationError(errors);

  const warnings: string[] = [];
  const dc = directCost(inp);
  const divisor = 1.0 - inp.overhead - inp.commission - inp.targetProfit;
  if (divisor <= 0) throw new Error("Overhead + Commission + Target Profit add up to 100% or more - impossible to calculate a price. Reduce the percentages.");
  const recommended = dc > 0 ? round2(dc / divisor) : 0.0;
  const belowMin = recommended < inp.minCharge;
  const dbsPrice = Math.max(recommended, inp.minCharge);
  if (belowMin && dc > 0) warnings.push(`Recommended price ($${recommended.toFixed(2)}) is below the minimum charge ($${inp.minCharge.toFixed(2)}). Minimum charge was applied instead.`);
  const ev = evaluatePrice(dbsPrice, dc, inp.overhead, inp.commission);
  const discountAmt = round2(dbsPrice * inp.discount);
  const priceAfterDiscount = round2(dbsPrice - discountAmt);
  const taxAmt = round2(priceAfterDiscount * inp.tax);
  const clientTotal = round2(priceAfterDiscount + taxAmt);
  let pricePerUnit: number | null = null;
  if (inp.pricingMode === MODE_UNIT && inp.unitQuantity > 0) pricePerUnit = round2(clientTotal / inp.unitQuantity);

  if (hasActualHours(inp.technicians)) {
    const eff = efficiency(inp.technicians);
    if (eff !== null) {
      if (eff < 85) warnings.push(`Labor efficiency ${eff.toFixed(1)}% (actual hours ran well above the estimate). Review the estimate used for this category.`);
      else if (eff > 130) warnings.push(`Labor efficiency ${eff.toFixed(1)}% (finished well faster than estimated). Consider revising the estimate downward.`);
    }
  }
  const benchmark = SERVICE_LABOR_SHARE[inp.service];
  const actualShare = laborShareActual(inp);
  if (benchmark !== undefined && actualShare !== null) {
    const diff = Math.abs(actualShare - benchmark);
    if (diff >= 0.15) warnings.push(`Labor share for this job (${Math.round(actualShare * 100)}%) is quite different from the typical value for '${inp.service}' (${Math.round(benchmark * 100)}%). Double-check the hours and costs entered.`);
  }

  let proposed: PriceEvaluation | null = null;
  if (inp.proposedPrice !== null && inp.proposedPrice !== undefined && inp.proposedPrice > 0) {
    proposed = evaluatePrice(inp.proposedPrice, dc, inp.overhead, inp.commission);
    if (proposed.margin < 0) warnings.push(`The proposed price ($${inp.proposedPrice.toFixed(2)}) results in a LOSS of $${Math.abs(proposed.profitAmt).toFixed(2)}.`);
    else if (proposed.margin < 0.25) warnings.push(`The proposed price ($${inp.proposedPrice.toFixed(2)}) is below 25% - requires management approval.`);
  }

  return {
    inputs: inp,
    directCost: dc,
    divisor: round4(divisor),
    recommendedPrice: recommended,
    belowMinimum: belowMin,
    dbsPrice: ev.price,
    discountAmt,
    priceAfterDiscount,
    taxAmt,
    clientTotal,
    pricePerUnit,
    overheadAmt: ev.overheadAmt,
    commissionAmt: ev.commissionAmt,
    totalCost: ev.totalCost,
    profitAmt: ev.profitAmt,
    margin: ev.margin,
    resultLabel: ev.label,
    resultColor: ev.color,
    resultAction: ev.action,
    proposed,
    warnings,
    laborCostTotal: laborCost(inp.technicians),
    laborHoursEstTotal: laborHoursEst(inp.technicians),
    laborHoursActualTotal: laborHoursActual(inp.technicians),
    efficiencyPct: efficiency(inp.technicians),
  };
}

export function money(v: number): string {
  return v < 0 ? `-$${Math.abs(v).toFixed(2)}` : `$${v.toFixed(2)}`;
}
export function pctFmt(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

// Formato de exportação/importação de histórico legado (.txt), mantido para migração.
export const HISTORY_HEADERS = [
  "timestamp", "client", "location", "invoice", "service_date", "service", "pricing_mode",
  "labor_cost", "direct_cost", "dbs_price", "discount_pct", "discount_amt", "tax_pct", "tax_amt",
  "client_total", "price_per_unit", "overhead_pct", "commission_pct", "commission_amt",
  "target_profit_pct", "profit_amt", "margin_pct", "result_label", "salesperson", "efficiency_pct",
] as const;

export type LegacyHistoryRow = Record<(typeof HISTORY_HEADERS)[number], string>;

export function legacyTextToRows(text: string): LegacyHistoryRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return [];
  return lines.slice(1).map((line) => {
    const parts = line.split("|");
    const row = {} as LegacyHistoryRow;
    HISTORY_HEADERS.forEach((h, i) => {
      row[h] = parts[i] !== undefined ? parts[i] : "";
    });
    return row;
  });
}
