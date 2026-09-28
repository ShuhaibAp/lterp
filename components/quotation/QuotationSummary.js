import { formatMoney, formatQuantity } from "@/lib/inspection-constants";
import shared from "../workflow.module.css";
import styles from "./quotation.module.css";

/** Read-only view of a quotation: items, totals, terms and signature. */
export default function QuotationSummary({ poId, quotation }) {
  return (
    <>
      <div className={shared.card}>
        <div className={shared.cardHead}>
          <h2 className={shared.cardTitle}>Quotation Items</h2>
        </div>
        <div className={shared.scroll}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Material</th>
                <th>UoM</th>
                <th className={shared.right}>Quantity</th>
                <th className={shared.right}>Unit Price</th>
                <th className={shared.right}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {quotation.lines.map((line, i) => (
                <tr key={line.id}>
                  <td className={shared.plain}>{i + 1}</td>
                  <td className={shared.plain}>{line.materialName}</td>
                  <td className={shared.plain}>{line.uom}</td>
                  <td className={`${shared.plain} ${shared.right}`}>{formatQuantity(line.quantity)}</td>
                  <td className={styles.amount}>{line.unitPrice === null ? "—" : formatMoney(line.unitPrice)}</td>
                  <td className={styles.amount}>{line.lineTotal === null ? "—" : formatMoney(line.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {quotation.gstPercent !== null && (
                <>
                  <tr className={styles.subRow}>
                    <td colSpan={5} className={shared.right}>
                      Subtotal
                    </td>
                    <td className={styles.amount}>{formatMoney(quotation.subtotal)}</td>
                  </tr>
                  <tr className={styles.subRow}>
                    <td colSpan={5} className={shared.right}>
                      GST @ {quotation.gstPercent}%
                    </td>
                    <td className={styles.amount}>{formatMoney(quotation.gstAmount)}</td>
                  </tr>
                </>
              )}
              <tr className={styles.tfoot}>
                <td colSpan={5} className={shared.right}>
                  Grand Total
                </td>
                <td className={`${styles.amount} ${styles.grand}`}>{formatMoney(quotation.grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {quotation.terms && (
        <div className={shared.card}>
          <div className={shared.cardHead}>
            <h2 className={shared.cardTitle}>Additional Terms &amp; Conditions</h2>
          </div>
          <p className={styles.terms}>{quotation.terms}</p>
        </div>
      )}

      {quotation.signature && (
        <div className={shared.card}>
          <div className={shared.cardHead}>
            <h2 className={shared.cardTitle}>Authorised Signature</h2>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.sigImage}
            src={`/purchase-orders/${poId}/quotation/signature?v=${encodeURIComponent(quotation.signature.uploadedAt)}`}
            alt="Authorised signature"
          />
        </div>
      )}
    </>
  );
}
