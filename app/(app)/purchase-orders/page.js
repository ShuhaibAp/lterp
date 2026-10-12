import Link from "next/link";
import Icon from "@/components/Icon";
import StatusPill from "@/components/StatusPill";
import { requireRole } from "@/lib/dal";
import { collectionCountdownShort } from "@/lib/operations-constants";
import { formatDay, PO_STAGES } from "@/lib/po-constants";
import { listPurchaseOrders } from "@/lib/purchase-orders";
import styles from "./po.module.css";

const COUNTDOWN_CLASS = { info: "countdownInfo", warn: "countdownWarn", bad: "countdownBad" };

export const metadata = { title: "PO List — Cynosure MIS" };

function pageHref({ search, status }, page) {
  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  if (status) qs.set("status", status);
  if (page > 1) qs.set("page", String(page));
  const s = qs.toString();
  return s ? `/purchase-orders?${s}` : "/purchase-orders";
}

// Rejected (Module 4) is a terminal side-branch, not a pipeline stage, so it is filterable
// here but kept out of PO_STAGES, which the lifecycle stepper renders in order.
const FILTER_STATUSES = [...PO_STAGES, "Rejected"];

export default async function PurchaseOrdersPage({ searchParams }) {
  const user = await requireRole("BD Team", "Admin", "Operations Team", "Factory Team");
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search.trim() : "";
  const status = FILTER_STATUSES.includes(params.status) ? params.status : "";
  const page = Math.max(parseInt(params.page, 10) || 1, 1);

  const { items, total, limit } = await listPurchaseOrders({ search, status, page });
  const lastPage = Math.max(Math.ceil(total / limit), 1);
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const filtered = Boolean(search || status);

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>Purchase Orders</h1>
          <p className={styles.sub}>
            {total} {total === 1 ? "order" : "orders"}
            {status ? ` in ${status}` : ""}
            {search ? ` matching “${search}”` : ""}
          </p>
        </div>
        {user.role === "BD Team" && (
          <Link href="/purchase-orders/new" className={styles.btnPrimary}>
            <Icon name="plus" size={18} />
            New PO
          </Link>
        )}
      </div>

      <form action="/purchase-orders" className={styles.toolbar} role="search">
        <label className={styles.searchBox}>
          <Icon name="search" size={18} />
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Search by PO number or customer"
            className={styles.searchInput}
            aria-label="Search purchase orders"
          />
        </label>
        <select name="status" defaultValue={status} className={styles.statusSelect} aria-label="Filter by stage">
          <option value="">All stages</option>
          {PO_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
          <option value="Rejected">Rejected</option>
        </select>
        <button type="submit" className={styles.btn}>
          Apply
        </button>
        {filtered && (
          <Link href="/purchase-orders" className={styles.clear}>
            Clear filters
          </Link>
        )}
      </form>

      <div className={styles.tableCard}>
        {items.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <Icon name="inbox" size={26} />
            </span>
            <div className={styles.emptyTitle}>
              {filtered ? "No matching purchase orders" : "No purchase orders yet"}
            </div>
            {filtered ? (
              <Link href="/purchase-orders">Clear filters</Link>
            ) : user.role === "BD Team" ? (
              <Link href="/purchase-orders/new">Register the first customer PO</Link>
            ) : (
              <span>Purchase orders registered by the BD team will appear here.</span>
            )}
          </div>
        ) : (
          <>
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>PO #</th>
                    <th>Customer</th>
                    <th className={styles.hideSm}>Service type</th>
                    <th>Status</th>
                    <th className={styles.hideMd}>Files</th>
                    <th className={styles.hideMd}>Created by</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((po) => {
                    const countdown =
                      po.status === "Operations" ? collectionCountdownShort(po.scheduledCollectionAt) : null;
                    return (
                      <tr key={po.id}>
                        <td>
                          <Link href={`/purchase-orders/${po.id}`} className={styles.poLink}>
                            {po.poNumber}
                          </Link>
                        </td>
                        <td className={styles.customer}>{po.customerName}</td>
                        <td className={styles.hideSm}>{po.serviceType}</td>
                        <td>
                          <StatusPill status={po.status} />
                          {countdown && (
                            <span className={`${styles.countdown} ${styles[COUNTDOWN_CLASS[countdown.tone]]}`}>
                              {countdown.text}
                            </span>
                          )}
                        </td>
                        <td className={`${styles.muted} ${styles.hideMd}`}>{po.documentCount}</td>
                        <td className={styles.hideMd}>{po.createdByName}</td>
                        <td className={`${styles.muted} ${styles.nowrap}`}>{formatDay(po.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className={styles.pager}>
              <span>
                Showing {from}–{to} of {total}
              </span>
              <div className={styles.pagerLinks}>
                {page > 1 && (
                  <Link href={pageHref({ search, status }, page - 1)} className={styles.btn}>
                    <Icon name="chevron-left" size={16} />
                    Previous
                  </Link>
                )}
                {page < lastPage && (
                  <Link href={pageHref({ search, status }, page + 1)} className={styles.btn}>
                    Next
                    <Icon name="chevron-right" size={16} />
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
