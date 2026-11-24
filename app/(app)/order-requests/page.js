import Link from "next/link";
import HandleRequestButton from "@/components/HandleRequestButton";
import { requireRole } from "@/lib/dal";
import { listOrderRequests } from "@/lib/order-requests";
import { formatDate } from "@/lib/po-constants";
import styles from "../purchase-orders/po.module.css";

export const metadata = { title: "Order requests" };

export default async function OrderRequestsPage() {
  const user = await requireRole("BD Team", "Admin");
  const requests = await listOrderRequests();
  const waiting = requests.filter((r) => r.status === "New");
  const done = requests.filter((r) => r.status !== "New");
  const isBd = user.role === "BD Team";

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>Order requests</h1>
          <p className={styles.sub}>
            {waiting.length} {waiting.length === 1 ? "customer is" : "customers are"} waiting. They told us from the
            customer app that they have material ready for pickup.
          </p>
        </div>
      </div>

      <div className={styles.tableCard}>
        {waiting.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No requests waiting</div>
            When a customer taps “I have an order ready” in the customer app, it appears here.
          </div>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Note</th>
                  <th>Requested</th>
                  {isBd && <th aria-label="Actions" />}
                </tr>
              </thead>
              <tbody>
                {waiting.map((r) => (
                  <tr key={r.id}>
                    <td>{r.customerName}</td>
                    <td className={styles.muted}>{r.customerEmail}</td>
                    <td>{r.note || "—"}</td>
                    <td className={styles.muted}>{formatDate(r.createdAt)}</td>
                    {isBd && (
                      <td className={styles.rowActions}>
                        <Link href={`/purchase-orders/new?request=${r.id}`} className={styles.btnPrimary}>
                          Create PO
                        </Link>
                        <HandleRequestButton id={r.id} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {done.length > 0 && (
        <>
          <h2 className={styles.sub}>Handled</h2>
          <div className={styles.tableCard}>
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Note</th>
                    <th>Requested</th>
                    <th>Handled by</th>
                    <th>PO</th>
                  </tr>
                </thead>
                <tbody>
                  {done.map((r) => (
                    <tr key={r.id}>
                      <td>{r.customerName}</td>
                      <td>{r.note || "—"}</td>
                      <td className={styles.muted}>{formatDate(r.createdAt)}</td>
                      <td className={styles.muted}>
                        {r.handledBy} · {formatDate(r.handledAt)}
                      </td>
                      <td>{r.poId ? <Link href={`/purchase-orders/${r.poId}`}>Open PO</Link> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
