import Link from "next/link";
import Icon from "@/components/Icon";
import LockIcon from "@/components/LockIcon";
import CustomerAccessCard from "@/components/CustomerAccessCard";
import PoHeader from "@/components/PoHeader";
import { requireRole } from "@/lib/dal";
import { formatBytes, formatDate } from "@/lib/po-constants";
import { getCustomerAccess, getPurchaseOrder } from "@/lib/purchase-orders";
import styles from "../po.module.css";

const AFTER_APPROVAL = ["Pickup", "Operations", "Factory", "Weighment", "AOR", "Final Reports"];

export const metadata = { title: "Purchase Order — Lifecycle & Traceability ERP" };

function Field({ label, value, locked, full }) {
  return (
    <div className={full ? styles.full : undefined}>
      <dt className={styles.fLabel}>{label}</dt>
      <dd className={`${styles.fValue} ${locked ? styles.fLocked : ""}`}>{value || "—"}</dd>
    </div>
  );
}

export default async function PurchaseOrderPage({ params, searchParams }) {
  const user = await requireRole("BD Team", "Admin", "Operations Team", "Factory Team");
  const { id } = await params;
  const { created, updated } = await searchParams;
  const po = await getPurchaseOrder(id);

  const isBd = user.role === "BD Team";
  // Once the client has approved (Pickup onwards) BD and Admin can see and resend the customer-app invite.
  const showAccess = (isBd || user.role === "Admin") && AFTER_APPROVAL.includes(po.status);
  const access = showAccess ? await getCustomerAccess(po.id) : null;
  const isOperations = user.role === "Operations Team";
  const isFactory = user.role === "Factory Team";
  const actions =
    isBd && !po.locked ? (
      <Link href={`/purchase-orders/${po.id}/edit`} className={styles.btnPrimary}>
        Edit details
      </Link>
    ) : null;

  return (
    <>
      <PoHeader po={po} tab="overview" role={user.role} actions={actions} />

      {created && <div className={styles.notice}>PO created. Its number is {po.poNumber}.</div>}
      {updated && <div className={styles.notice}>Changes saved.</div>}

      {isBd && po.status === "Registration" && (
        <div className={styles.nextStep}>
          <span>Next step: choose how this PO will be inspected (Onsite or Virtual).</span>
          <Link href={`/purchase-orders/${po.id}/inspection`} className={styles.btnPrimary}>
            Go to Inspection
            <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      )}

      {isBd && po.status === "Pickup" && (
        <div className={styles.nextStep}>
          <span>Next step: schedule the collection and generate the Inspection Report.</span>
          <Link href={`/purchase-orders/${po.id}/pickup`} className={styles.btnPrimary}>
            Go to Pickup Request
            <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      )}

      {isOperations && po.status === "Operations" && (
        <div className={styles.nextStep}>
          <span>Next step: acknowledge the Inspection Report and record the collection.</span>
          <Link href={`/purchase-orders/${po.id}/operations`} className={styles.btnPrimary}>
            Go to Operations
            <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      )}

      {isFactory && po.status === "Factory" && (
        <div className={styles.nextStep}>
          <span>Next step: weigh the vehicle, upload both weighment slips and record what was processed.</span>
          <Link href={`/purchase-orders/${po.id}/factory`} className={styles.btnPrimary}>
            Go to Factory
            <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      )}

      {(isBd || user.role === "Admin") && po.status === "Weighment" && (
        <div className={styles.nextStep}>
          <span>The weighment cross-check needs attention: explain the weight difference to continue.</span>
          <Link href={`/purchase-orders/${po.id}/weighment`} className={styles.btnPrimary}>
            Go to Weighment
            <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      )}

      {user.role === "Admin" && po.status === "AOR" && (
        <div className={styles.nextStep}>
          <span>Next step: send the AOR to the client, then generate the final reports.</span>
          <Link href={`/purchase-orders/${po.id}/aor`} className={styles.btnPrimary}>
            Go to AOR
            <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      )}

      {po.locked && (
        <div className={styles.lockBanner}>
          <LockIcon size={16} color="#5d5c58" />
          This record is locked. The PO has moved to the {po.status} stage and can no longer be edited.
        </div>
      )}

      <div className={styles.overview}>
        <div className={styles.stack}>
          <section className={styles.card}>
            <header className={styles.cardHead}>
              <h2 className={styles.cardTitle}>Customer &amp; PO details</h2>
              {po.locked && (
                <span className={styles.lockedBadge}>
                  <LockIcon size={13} color="#5d5c58" />
                  Locked
                </span>
              )}
            </header>
            <dl className={styles.details}>
              <Field label="Customer name" value={po.customer.name} locked={po.locked} />
              <Field label="Phone number" value={po.customer.phone} locked={po.locked} />
              <Field label="Location" value={po.customer.location} locked={po.locked} full />
              <Field label="Address" value={po.customer.address} locked={po.locked} full />
              <Field label="Email address" value={po.customer.email} locked={po.locked} />
              <Field label="Service type" value={po.serviceType} locked={po.locked} />
              <Field label="PO instructions" value={po.poInstructions} locked={po.locked} full />
            </dl>
          </section>
        </div>

        <div className={styles.stack}>
          <section className={styles.card}>
            <header className={styles.cardHead}>
              <h2 className={styles.cardTitle}>Attachments ({po.documents.length})</h2>
            </header>
            {po.documents.length === 0 ? (
              <p className={styles.fValue}>No documents were uploaded with this PO.</p>
            ) : (
              <ul className={styles.docs}>
                {po.documents.map((d) => (
                  <li key={d.id} className={styles.doc}>
                    <span className={styles.docIcon}>
                      <Icon name="file" size={20} />
                    </span>
                    <span className={styles.docText}>
                      <a
                        className={styles.docName}
                        href={`/purchase-orders/${po.id}/documents/${d.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {d.name}
                      </a>
                      <span className={styles.docMeta}>{formatBytes(d.size)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {access && <CustomerAccessCard poId={po.id} email={po.customer.email} initialStatus={access.status} />}

          <section className={styles.card}>
            <header className={styles.cardHead}>
              <h2 className={styles.cardTitle}>Record</h2>
            </header>
            <dl className={styles.record}>
              <Field label="Created by" value={po.createdBy.name} />
              <Field label="Created" value={formatDate(po.createdAt)} />
              <Field label="Last updated" value={formatDate(po.updatedAt)} />
            </dl>
          </section>
        </div>
      </div>
    </>
  );
}
