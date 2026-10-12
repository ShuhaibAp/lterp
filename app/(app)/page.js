import Link from "next/link";
import Icon from "@/components/Icon";
import StatusPill from "@/components/StatusPill";
import ui from "@/components/ui.module.css";
import { verifySession } from "@/lib/dal";
import { formatMoney } from "@/lib/inspection-constants";
import { formatDay } from "@/lib/po-constants";
import { getPoSummary, listPurchaseOrders } from "@/lib/purchase-orders";
import { listPendingQuotations } from "@/lib/quotation";
import styles from "./dashboard.module.css";

export const metadata = { title: "Dashboard — Cynosure MIS" };

function greeting() {
  const hour = Number(
    new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const countOf = (byStatus, ...statuses) =>
  byStatus.filter((s) => statuses.includes(s.status)).reduce((sum, s) => sum + s.count, 0);

export default async function DashboardPage() {
  const user = await verifySession();
  const firstName = user.name.split(" ")[0];
  const isAdmin = user.role === "Admin";
  const isBd = user.role === "BD Team";
  const isOperations = user.role === "Operations Team";
  const isFactory = user.role === "Factory Team";

  if (!isAdmin && !isBd && !isOperations && !isFactory) {
    return (
      <>
        <div className={ui.pageHead}>
          <div>
            <h1 className={ui.h1}>
              {greeting()}, {firstName}
            </h1>
            <p className={ui.sub}>{user.role}</p>
          </div>
        </div>
        <div className={styles.soon}>
          <span className={styles.soonIcon}>
            <Icon name="clock" size={26} />
          </span>
          <h2 className={styles.soonTitle}>Your workspace is on its way</h2>
          <p className={styles.soonText}>
            The {user.role} screens are built after the BD team stages. They will appear in the sidebar as soon as they
            are ready.
          </p>
        </div>
      </>
    );
  }

  const [summary, approvals, operationsQueue, factoryQueue] = await Promise.all([
    getPoSummary(),
    isAdmin ? listPendingQuotations() : null,
    isOperations ? listPurchaseOrders({ status: "Operations", page: 1 }) : null,
    isFactory ? listPurchaseOrders({ status: "Factory", page: 1 }) : null,
  ]);
  const { total, byStatus, rejected, recent } = summary;
  const completed = countOf(byStatus, "Final Reports");
  const busiest = Math.max(1, ...byStatus.map((s) => s.count));

  const kpis = [
    { label: "Total orders", value: total, icon: "orders", tone: "brand" },
    { label: "Active orders", value: total - completed - rejected, icon: "clock", tone: "info" },
    isAdmin
      ? { label: "Awaiting approval", value: approvals.total, icon: "approvals", tone: "warn", href: "/quotations" }
      : isOperations
        ? {
            label: "Awaiting your action",
            value: countOf(byStatus, "Operations"),
            icon: "approvals",
            tone: "warn",
            href: "/purchase-orders?status=Operations",
          }
        : isFactory
          ? {
              label: "Awaiting your action",
              value: countOf(byStatus, "Factory"),
              icon: "approvals",
              tone: "warn",
              href: "/purchase-orders?status=Factory",
            }
          : {
            label: "Awaiting your action",
            value: countOf(byStatus, "Registration", "Inspection", "Quotation"),
            icon: "approvals",
            tone: "warn",
          },
    { label: "Completed", value: completed, icon: "check", tone: "good" },
    { label: "Rejected", value: rejected, icon: "close", tone: "bad", href: "/purchase-orders?status=Rejected" },
  ];

  return (
    <>
      <div className={ui.pageHead}>
        <div>
          <h1 className={ui.h1}>
            {greeting()}, {firstName}
          </h1>
          <p className={ui.sub}>Here is where every purchase order stands today.</p>
        </div>
        {isBd && (
          <Link href="/purchase-orders/new" className={ui.btnPrimary}>
            <Icon name="plus" size={18} />
            New PO
          </Link>
        )}
      </div>

      <section className={styles.kpis} aria-label="Key numbers">
        {kpis.map((kpi) => {
          const body = (
            <>
              <span className={`${styles.kpiIcon} ${styles[kpi.tone]}`}>
                <Icon name={kpi.icon} size={22} />
              </span>
              <span className={styles.kpiValue}>{kpi.value}</span>
              <span className={styles.kpiLabel}>{kpi.label}</span>
            </>
          );
          return kpi.href ? (
            <Link key={kpi.label} href={kpi.href} className={`${styles.kpi} ${styles.kpiLink}`}>
              {body}
            </Link>
          ) : (
            <div key={kpi.label} className={styles.kpi}>
              {body}
            </div>
          );
        })}
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2 className={styles.panelTitle}>Order pipeline</h2>
          <span className={styles.panelHint}>Select a stage to see its orders</span>
        </div>
        <div className={styles.stages}>
          {byStatus.map(({ status, count }, index) => (
            <Link
              key={status}
              href={`/purchase-orders?status=${encodeURIComponent(status)}`}
              className={`${styles.stage} ${count === 0 ? styles.stageEmpty : ""}`}
            >
              <span className={styles.stageStep}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.stageCount}>{count}</span>
              <span className={styles.stageName}>{status}</span>
              <span className={styles.stageBar} aria-hidden="true">
                <span style={{ width: `${(count / busiest) * 100}%` }} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className={styles.lower}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Recent orders</h2>
            <Link href="/purchase-orders" className={styles.more}>
              View all <Icon name="arrow-right" size={16} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>
                <Icon name="inbox" size={24} />
              </span>
              <div className={styles.emptyTitle}>No purchase orders yet</div>
              {isBd ? (
                <Link href="/purchase-orders/new">Register the first customer PO</Link>
              ) : (
                <span>Orders registered by the BD team will appear here.</span>
              )}
            </div>
          ) : (
            <ul className={styles.list}>
              {recent.map((po) => (
                <li key={po.id}>
                  <Link href={`/purchase-orders/${po.id}`} className={styles.row}>
                    <span className={styles.rowMain}>
                      <span className={styles.rowTitle}>{po.customerName}</span>
                      <span className={styles.rowSub}>
                        <span className={ui.mono}>{po.poNumber}</span> · {po.serviceType}
                      </span>
                    </span>
                    <span className={styles.rowSide}>
                      <StatusPill status={po.status} />
                      <span className={styles.rowDate}>{formatDay(po.createdAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {isAdmin && (
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Waiting for your approval</h2>
              <Link href="/quotations" className={styles.more}>
                Open queue <Icon name="arrow-right" size={16} />
              </Link>
            </div>
            {approvals.items.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>
                  <Icon name="check" size={24} />
                </span>
                <div className={styles.emptyTitle}>All caught up</div>
                <span>No quotations are waiting for a decision.</span>
              </div>
            ) : (
              <ul className={styles.list}>
                {approvals.items.slice(0, 5).map((item) => (
                  <li key={`${item.poId}-${item.version}`}>
                    <Link href={`/purchase-orders/${item.poId}/quotation`} className={styles.row}>
                      <span className={styles.rowMain}>
                        <span className={styles.rowTitle}>{item.customerName}</span>
                        <span className={styles.rowSub}>
                          <span className={ui.mono}>{item.poNumber}</span> · v{item.version} · by {item.submittedBy}
                        </span>
                      </span>
                      <span className={styles.rowSide}>
                        <span className={styles.amount}>{formatMoney(item.grandTotal)}</span>
                        <span className={styles.rowDate}>{formatDay(item.submittedAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {isOperations && (
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Needs your action</h2>
              <Link href="/purchase-orders?status=Operations" className={styles.more}>
                View all <Icon name="arrow-right" size={16} />
              </Link>
            </div>
            {operationsQueue.items.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>
                  <Icon name="check" size={24} />
                </span>
                <div className={styles.emptyTitle}>All caught up</div>
                <span>No purchase orders are waiting on Operations right now.</span>
              </div>
            ) : (
              <ul className={styles.list}>
                {operationsQueue.items.slice(0, 5).map((po) => (
                  <li key={po.id}>
                    <Link href={`/purchase-orders/${po.id}/operations`} className={styles.row}>
                      <span className={styles.rowMain}>
                        <span className={styles.rowTitle}>{po.customerName}</span>
                        <span className={styles.rowSub}>
                          <span className={ui.mono}>{po.poNumber}</span> · {po.serviceType}
                        </span>
                      </span>
                      <span className={styles.rowSide}>
                        <StatusPill status={po.status} />
                        <span className={styles.rowDate}>{formatDay(po.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {isFactory && (
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Needs your action</h2>
              <Link href="/purchase-orders?status=Factory" className={styles.more}>
                View all <Icon name="arrow-right" size={16} />
              </Link>
            </div>
            {factoryQueue.items.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>
                  <Icon name="check" size={24} />
                </span>
                <div className={styles.emptyTitle}>All caught up</div>
                <span>No purchase orders are waiting on Factory right now.</span>
              </div>
            ) : (
              <ul className={styles.list}>
                {factoryQueue.items.slice(0, 5).map((po) => (
                  <li key={po.id}>
                    <Link href={`/purchase-orders/${po.id}/factory`} className={styles.row}>
                      <span className={styles.rowMain}>
                        <span className={styles.rowTitle}>{po.customerName}</span>
                        <span className={styles.rowSub}>
                          <span className={ui.mono}>{po.poNumber}</span> · {po.serviceType}
                        </span>
                      </span>
                      <span className={styles.rowSide}>
                        <StatusPill status={po.status} />
                        <span className={styles.rowDate}>{formatDay(po.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {isBd && (
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Quick actions</h2>
            </div>
            <div className={styles.actions}>
              <Link href="/purchase-orders/new" className={styles.action}>
                <span className={`${styles.kpiIcon} ${styles.brand}`}>
                  <Icon name="plus-circle" size={22} />
                </span>
                <span>
                  <strong>Register a new PO</strong>
                  <span>Capture the customer and their purchase order documents.</span>
                </span>
              </Link>
              <Link href="/purchase-orders" className={styles.action}>
                <span className={`${styles.kpiIcon} ${styles.info}`}>
                  <Icon name="orders" size={22} />
                </span>
                <span>
                  <strong>Browse purchase orders</strong>
                  <span>Search by PO number or customer and continue the work.</span>
                </span>
              </Link>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
