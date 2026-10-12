import Link from "next/link";
import { PO_STAGES } from "@/lib/po-constants";
import Icon from "./Icon";
import StatusPill from "./StatusPill";
import styles from "./PoHeader.module.css";

const ALL_STAFF = ["BD Team", "Admin", "Operations Team", "Factory Team"];

// Add a tab here when a module's screen is built. `roles` mirrors the SoW permission matrix -
// Quotation has no Operations row at all, so that tab simply isn't offered to that role.
const TABS = [
  { key: "overview", label: "Overview", path: "", roles: ALL_STAFF },
  { key: "inspection", label: "Inspection", path: "/inspection", roles: ALL_STAFF },
  { key: "quotation", label: "Quotation", path: "/quotation", roles: ["BD Team", "Admin"] },
  { key: "pickup", label: "Pickup", path: "/pickup", roles: ALL_STAFF },
  { key: "operations", label: "Operations", path: "/operations", roles: ALL_STAFF },
  { key: "factory", label: "Factory", path: "/factory", roles: ALL_STAFF },
  { key: "weighment", label: "Weighment", path: "/weighment", roles: ALL_STAFF },
  { key: "aor", label: "AOR", path: "/aor", roles: ALL_STAFF },
  { key: "reports", label: "Final Reports", path: "/reports", roles: ALL_STAFF },
];

export default function PoHeader({ po, tab, role, actions }) {
  const current = PO_STAGES.indexOf(po.status);
  const tabs = TABS.filter((t) => t.roles.includes(role));

  return (
    <>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Link href="/purchase-orders">Purchase Orders</Link>
        <Icon name="chevron-right" size={14} />
        <span aria-current="page">{po.poNumber}</span>
      </nav>

      <div className={styles.head}>
        <div className={styles.headMain}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{po.poNumber}</h1>
            <StatusPill status={po.status} />
          </div>
          <p className={styles.sub}>
            {po.customer.name} · {po.serviceType}
          </p>
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>

      {po.status === "Rejected" ? (
        <div className={styles.rejectedBanner}>
          <Icon name="close" size={16} />
          Closed — the client rejected this quotation. It has left the order pipeline.
        </div>
      ) : (
        <ol className={styles.stepper} aria-label="Order lifecycle">
          {PO_STAGES.map((stage, index) => {
            const state = index < current ? styles.done : index === current ? styles.now : "";
            return (
              <li key={stage} className={`${styles.step} ${state}`} aria-current={index === current ? "step" : undefined}>
                <span className={styles.node}>{index < current ? <Icon name="check" size={14} /> : index + 1}</span>
                <span className={styles.stepLabel}>{stage}</span>
              </li>
            );
          })}
        </ol>
      )}

      <nav className={styles.tabs} aria-label="Purchase order sections">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/purchase-orders/${po.id}${t.path}`}
            className={`${styles.tab} ${t.key === tab ? styles.active : ""}`}
            aria-current={t.key === tab ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
