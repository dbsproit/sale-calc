import { money, pctFmt, technicianCost, PAY_FLAT, type CalculationResult, type PricingInputs } from "@/lib/pricing-engine";

export function PrintReport({ inputs, result }: { inputs: PricingInputs; result: CalculationResult }) {
  const gen = new Date().toLocaleString();
  const techs = inputs.technicians.filter(
    (t) => !(t.estHours <= 0 && t.actualHours <= 0 && t.rate <= 0 && t.flatAmount <= 0 && !(t.name || "").trim())
  );

  return (
    <>
      <div className="pr-header">
        <div className="pr-logo-strip">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.png" alt="DBS Building Services" />
        </div>
        <div className="pr-brand">DBS BUILDING SERVICES</div>
        <h1>Extra Service Pricing Report</h1>
        <div className="pr-sub">Price to charge the client, protecting the target margin</div>
      </div>

      <table className="pr-info">
        <tbody>
          <tr>
            <td className="pr-label">Client</td>
            <td>{inputs.client || "-"}</td>
            <td className="pr-label">Invoice #</td>
            <td>{inputs.invoice || "-"}</td>
          </tr>
          <tr>
            <td className="pr-label">Location</td>
            <td>{inputs.location || "-"}</td>
            <td className="pr-label">Service date</td>
            <td>{inputs.date || "-"}</td>
          </tr>
          <tr>
            <td className="pr-label">Service</td>
            <td>{inputs.service}</td>
            <td className="pr-label">Salesperson</td>
            <td>{inputs.salesperson || "-"}</td>
          </tr>
          <tr>
            <td className="pr-label">Pricing mode</td>
            <td>{inputs.pricingMode}</td>
            <td className="pr-label">Generated</td>
            <td>{gen}</td>
          </tr>
        </tbody>
      </table>

      <div className="pr-banner">
        <span className="pr-banner-label">PRICE TO CHARGE THE CLIENT</span>
        <span className="pr-banner-value">{money(result.clientTotal)}</span>
      </div>
      <div className="pr-subnote">
        {result.pricePerUnit !== null && (
          <>
            {money(result.pricePerUnit)} per {inputs.unitLabel} ({inputs.unitQuantity} {inputs.unitLabel})
            <br />
          </>
        )}
        DBS internal price (pre discount/tax): {money(result.dbsPrice)}
        {result.belowMinimum && (
          <>
            <br />
            Formula price was {money(result.recommendedPrice)}; minimum charge applied.
          </>
        )}
      </div>

      {techs.length > 0 && (
        <>
          <div className="pr-section-title">Step 1 - Labor</div>
          <table className="pr-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Pay</th>
                <th>Est h</th>
                <th>Actual h</th>
                <th>Rate/Flat</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {techs.map((t, i) => (
                <tr key={i}>
                  <td>{t.name || "-"}</td>
                  <td>{t.role}</td>
                  <td>{t.payType}</td>
                  <td>{t.estHours || "-"}</td>
                  <td>{t.actualHours > 0 ? t.actualHours : "-"}</td>
                  <td>{t.payType === PAY_FLAT ? money(t.flatAmount) : `${money(t.rate)}/h`}</td>
                  <td>{money(technicianCost(t))}</td>
                </tr>
              ))}
              <tr className="pr-total">
                <td colSpan={6}>Total labor</td>
                <td>{money(result.laborCostTotal)}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      <div className="pr-section-title">Step 2 - Estimated direct cost</div>
      <table className="pr-table">
        <tbody>
          <tr>
            <td>Labor</td>
            <td>{money(result.laborCostTotal)}</td>
          </tr>
          <tr>
            <td>Chemicals</td>
            <td>{money(inputs.chemicals)}</td>
          </tr>
          <tr>
            <td>Machine / equipment</td>
            <td>{money(inputs.machine)}</td>
          </tr>
          <tr>
            <td>Consumables</td>
            <td>{money(inputs.consumables)}</td>
          </tr>
          <tr>
            <td>Water</td>
            <td>{money(inputs.water)}</td>
          </tr>
          <tr>
            <td>Vehicle / travel</td>
            <td>{money(inputs.vehicle)}</td>
          </tr>
          <tr className="pr-total">
            <td>Estimated Direct Cost</td>
            <td>{money(result.directCost)}</td>
          </tr>
        </tbody>
      </table>

      <div className="pr-section-title">Step 3 - Pricing math (DBS internal price)</div>
      <table className="pr-table">
        <tbody>
          <tr>
            <td>Overhead</td>
            <td>{pctFmt(inputs.overhead)}</td>
          </tr>
          <tr>
            <td>Commission ({inputs.salesperson || "n/a"})</td>
            <td>{pctFmt(inputs.commission)}</td>
          </tr>
          <tr>
            <td>Target profit</td>
            <td>{pctFmt(inputs.targetProfit)}</td>
          </tr>
          <tr>
            <td>Divisor</td>
            <td>{result.divisor.toFixed(4)}</td>
          </tr>
          <tr className="pr-total">
            <td>DBS price = Direct cost / divisor</td>
            <td>{money(result.dbsPrice)}</td>
          </tr>
        </tbody>
      </table>

      <div className="pr-section-title">Step 4 - Discount, tax and client total</div>
      <table className="pr-table">
        <tbody>
          <tr>
            <td>DBS price</td>
            <td>{money(result.dbsPrice)}</td>
          </tr>
          <tr>
            <td>Discount ({pctFmt(inputs.discount)})</td>
            <td>-{money(result.discountAmt)}</td>
          </tr>
          <tr>
            <td>Price after discount</td>
            <td>{money(result.priceAfterDiscount)}</td>
          </tr>
          <tr>
            <td>Tax ({pctFmt(inputs.tax)})</td>
            <td>+{money(result.taxAmt)}</td>
          </tr>
          <tr className="pr-total">
            <td>Client invoice total</td>
            <td>{money(result.clientTotal)}</td>
          </tr>
        </tbody>
      </table>

      <div className="pr-section-title">Result at the DBS price (pre discount/tax)</div>
      <table className="pr-table">
        <tbody>
          <tr>
            <td>Direct cost</td>
            <td>-{money(result.directCost)}</td>
          </tr>
          <tr>
            <td>Overhead</td>
            <td>-{money(result.overheadAmt)}</td>
          </tr>
          <tr>
            <td>Commission</td>
            <td>-{money(result.commissionAmt)}</td>
          </tr>
          <tr className="pr-total">
            <td>Net profit</td>
            <td>{money(result.profitAmt)}</td>
          </tr>
          <tr className="pr-total">
            <td>Profit margin</td>
            <td>{pctFmt(result.margin)}</td>
          </tr>
        </tbody>
      </table>
      <div className="pr-result-band" style={{ background: result.resultColor }}>
        <span>{result.resultLabel}</span>
        <span>{pctFmt(result.margin)} margin</span>
      </div>
      <div className="pr-subnote">{result.resultAction}</div>

      {result.proposed && (
        <>
          <div className="pr-section-title">Evaluation of the proposed price</div>
          <table className="pr-table">
            <tbody>
              <tr>
                <td>Proposed price</td>
                <td>{money(result.proposed.price)}</td>
              </tr>
              <tr>
                <td>Total cost</td>
                <td>-{money(result.proposed.totalCost)}</td>
              </tr>
              <tr className="pr-total">
                <td>Net profit</td>
                <td>{money(result.proposed.profitAmt)}</td>
              </tr>
              <tr className="pr-total">
                <td>Profit margin</td>
                <td>{pctFmt(result.proposed.margin)}</td>
              </tr>
            </tbody>
          </table>
          <div className="pr-result-band" style={{ background: result.proposed.color }}>
            <span>{result.proposed.label}</span>
          </div>
        </>
      )}

      {result.warnings.length > 0 && (
        <>
          <div className="pr-section-title">Notes</div>
          <ul className="pr-notes">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </>
      )}

      <div className="pr-footer">
        Overhead, commission, target profit and minimum charge are DBS policy placeholders - confirm with Finance against real cost data. This
        report is a pricing aid, not a final financial determination.
      </div>
    </>
  );
}
