import Link from "next/link";
import styles from "@/components/quotation/quotation.module.css";
import { requireRole } from "@/lib/dal";
import { formatMoney } from "@/lib/inspection-constants";
import { formatDate } from "@/lib/po-constants";
import { listPendingQuotations } from "@/lib/quotation";
import poStyles from "../purchase-orders/po.module.css";

export const metadata = { title: "Approvals — Lifecycle & Traceability ERP" };

export default async function ApprovalQueuePage() {
  await requireRole("Admin");
  const { items, total } = await listPendingQuotations();

  return (
    <>
      <div className={poStyles.pageHead}>
        <div>
          <h1 className={poStyles.h1}>Quotation Approvals</h1>
          <p className={poStyles.sub}>
            {total} {total === 1 ? "quotation is" : "quotations are"} waiting for approval
          </p>
        </div>
      </div>

      <div className={poStyles.tableCard}>
        {items.length === 0 ? (
          <div className={poStyles.empty}>
            <div className={poStyles.emptyTitle}>Nothing to approve</div>
            Quotations submitted by the BD team will appear here.
          </div>
        ) : (
          <div className={poStyles.scroll}>
            <table className={poStyles.table}>
              <thead>
                <tr>
                  <th>PO #</th>
                  <th>Customer</th>
                  <th>Version</th>
                  <th className={poStyles.right}>Grand Total</th>
                  <th>Submitted</th>
                  <th>Submitted By</th>
                  <th aria-label="Review" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={`${item.poId}-${item.version}`}>
                    <td className={styles.queueLink}>
                      <Link href={`/purchase-orders/${item.poId}/quotation`}>{item.poNumber}</Link>
                    </td>
                    <td>{item.customerName}</td>
                    <td>v{item.version}</td>
                    <td className={styles.amount}>{formatMoney(item.grandTotal)}</td>
                    <td className={poStyles.muted}>{formatDate(item.submittedAt)}</td>
                    <td>{item.submittedBy}</td>
                    <td>
                      <Link href={`/purchase-orders/${item.poId}/quotation`} className={poStyles.btnPrimary}>
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
