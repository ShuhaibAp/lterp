import PoHeader from "@/components/PoHeader";
import SendAorButton from "@/components/closeout/SendAorButton";
import styles from "@/components/closeout/closeout.module.css";
import shared from "@/components/workflow.module.css";
import { requireRole } from "@/lib/dal";
import { getAor } from "@/lib/closeout";
import { formatDate, formatDay } from "@/lib/po-constants";
import { getPurchaseOrder } from "@/lib/purchase-orders";

export const metadata = { title: "AOR — Lifecycle & Traceability ERP" };

export default async function AorPage({ params }) {
  const user = await requireRole("BD Team", "Admin", "Operations Team", "Factory Team");
  const { id } = await params;
  const [po, data] = await Promise.all([getPurchaseOrder(id), getAor(id)]);
  const a = data.aor;

  return (
    <>
      <PoHeader po={po} tab="aor" role={user.role} />

      {!a ? (
        <div className={shared.card}>
          <div className={`${styles.result} ${styles.pending}`}>Not generated yet</div>
          <p className={shared.text}>
            The Acknowledgement of Receipt is created automatically once both Operations and Factory have marked their
            work complete.
          </p>
        </div>
      ) : (
        <div className={shared.card}>
          <h2 className={shared.cardTitle}>Acknowledgement of Receipt</h2>
          <div className={`${styles.result} ${a.sentAt ? styles.pass : a.overdue ? styles.fail : styles.pending}`} role="status">
            {a.sentAt
              ? `Sent to the client by ${a.sentBy} on ${formatDate(a.sentAt)}.`
              : a.overdue
                ? `Overdue — it was due on ${formatDay(a.dueAt)}.`
                : `Due on ${formatDay(a.dueAt)}.`}
          </div>
          <dl className={styles.facts}>
            <div>
              <dt>Generated</dt>
              <dd>{formatDate(a.generatedAt)}</dd>
            </div>
            <div>
              <dt>SLA starts (later of Operations / Factory completion)</dt>
              <dd>{formatDate(a.anchorAt)}</dd>
            </div>
            <div>
              <dt>Due (2 working days)</dt>
              <dd className={a.overdue ? styles.overdue : undefined}>{formatDay(a.dueAt)}</dd>
            </div>
          </dl>
          <div className={shared.actions}>
            <a className={shared.btn} href={`/purchase-orders/${id}/aor/download`} target="_blank" rel="noreferrer">
              Download AOR (PDF)
            </a>
            {data.canSend && <SendAorButton poId={id} />}
          </div>
        </div>
      )}
    </>
  );
}
