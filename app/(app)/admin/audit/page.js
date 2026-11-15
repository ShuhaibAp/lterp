import Link from "next/link";
import Icon from "@/components/Icon";
import { requireRole } from "@/lib/dal";
import { listAudit } from "@/lib/admin";
import { formatDate, STAFF_ROLES } from "@/lib/po-constants";
import admin from "@/components/admin/admin.module.css";
import styles from "../../purchase-orders/po.module.css";

export const metadata = { title: "Audit log — Lifecycle & Traceability ERP" };

const FILTERS = ["poNumber", "action", "actor", "role", "from", "to"];
const ROLE_OPTIONS = [...STAFF_ROLES, "Customer"];

function pageHref(filters, page) {
  const qs = new URLSearchParams();
  for (const key of FILTERS) if (filters[key]) qs.set(key, filters[key]);
  if (page > 1) qs.set("page", String(page));
  const s = qs.toString();
  return s ? `/admin/audit?${s}` : "/admin/audit";
}

function summarise(details) {
  if (!details) return "";
  const text = JSON.stringify(details);
  return text.length > 240 ? `${text.slice(0, 240)}…` : text;
}

export default async function AuditPage({ searchParams }) {
  await requireRole("Admin");
  const params = await searchParams;
  const filters = Object.fromEntries(FILTERS.map((k) => [k, typeof params[k] === "string" ? params[k].trim() : ""]));
  const page = Math.max(parseInt(params.page, 10) || 1, 1);

  const { items, total, limit } = await listAudit({ ...filters, page });
  const lastPage = Math.max(Math.ceil(total / limit), 1);
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const filtered = FILTERS.some((k) => filters[k]);

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>Audit log</h1>
          <p className={styles.sub}>
            Every data entry, status change and document download, with who did it and when. {total}{" "}
            {total === 1 ? "event" : "events"}
            {filtered ? " match your filters" : ""}.
          </p>
        </div>
      </div>

      <form action="/admin/audit" className={admin.filters}>
        <div className={admin.field}>
          <label className={admin.label} htmlFor="poNumber">
            PO number
          </label>
          <input id="poNumber" name="poNumber" className={admin.input} defaultValue={filters.poNumber} placeholder="PO-2026-0001" />
        </div>
        <div className={admin.field}>
          <label className={admin.label} htmlFor="action">
            Action starts with
          </label>
          <input id="action" name="action" className={admin.input} defaultValue={filters.action} placeholder="quotation." />
        </div>
        <div className={admin.field}>
          <label className={admin.label} htmlFor="actor">
            Person
          </label>
          <input id="actor" name="actor" className={admin.input} defaultValue={filters.actor} placeholder="Name" />
        </div>
        <div className={admin.field}>
          <label className={admin.label} htmlFor="role">
            Role
          </label>
          <select id="role" name="role" className={admin.input} defaultValue={filters.role}>
            <option value="">All roles</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className={admin.field}>
          <label className={admin.label} htmlFor="from">
            From
          </label>
          <input id="from" name="from" type="date" className={admin.input} defaultValue={filters.from} />
        </div>
        <div className={admin.field}>
          <label className={admin.label} htmlFor="to">
            To
          </label>
          <input id="to" name="to" type="date" className={admin.input} defaultValue={filters.to} />
        </div>
        <div className={admin.actions}>
          <button type="submit" className={admin.btnPrimary}>
            <Icon name="search" size={16} />
            Filter
          </button>
          {filtered && (
            <Link href="/admin/audit" className={admin.btn}>
              Clear
            </Link>
          )}
        </div>
      </form>

      <div className={styles.tableCard}>
        {items.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No events</div>
            {filtered ? "Nothing matches these filters." : "Activity will appear here as people use the system."}
          </div>
        ) : (
          <>
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Person</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>PO</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((e) => (
                    <tr key={e.id}>
                      <td className={styles.nowrap}>{formatDate(e.at)}</td>
                      <td>{e.actorName}</td>
                      <td className={styles.muted}>{e.actorRole}</td>
                      <td className={styles.mono}>{e.action}</td>
                      <td className={styles.mono}>{e.poNumber ?? "—"}</td>
                      <td className={admin.details}>{summarise(e.details)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.pager}>
              <span>
                Showing {from}–{to} of {total}
              </span>
              <div className={styles.pagerLinks}>
                {page > 1 && (
                  <Link href={pageHref(filters, page - 1)} className={styles.btn}>
                    <Icon name="chevron-left" size={16} />
                    Previous
                  </Link>
                )}
                {page < lastPage && (
                  <Link href={pageHref(filters, page + 1)} className={styles.btn}>
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
