import Link from "next/link";
import Icon from "@/components/Icon";
import { requireRole } from "@/lib/dal";
import { listUsers } from "@/lib/admin";
import styles from "../../purchase-orders/po.module.css";

export const metadata = { title: "Users — Lifecycle & Traceability ERP" };

export default async function UsersPage({ searchParams }) {
  const me = await requireRole("Admin");
  const { created, updated } = await searchParams;
  const users = await listUsers();
  const staff = users.filter((u) => !u.isCustomer);
  const customers = users.filter((u) => u.isCustomer);

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>Users</h1>
          <p className={styles.sub}>
            {staff.length} staff {staff.length === 1 ? "account" : "accounts"}
            {customers.length > 0 ? ` and ${customers.length} customer ${customers.length === 1 ? "login" : "logins"}` : ""}
          </p>
        </div>
        <Link href="/admin/users/new" className={styles.btnPrimary}>
          <Icon name="plus" size={18} />
          New user
        </Link>
      </div>

      {created && <div className={styles.notice}>Account created.</div>}
      {updated && <div className={styles.notice}>Changes saved.</div>}

      <div className={styles.tableCard}>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Status</th>
                <th aria-label="Edit" />
              </tr>
            </thead>
            <tbody>
              {[...staff, ...customers].map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.name}
                    {u.id === me.id && <span className={styles.muted}> (you)</span>}
                  </td>
                  <td className={styles.muted}>{u.email}</td>
                  <td>{u.roles.join(", ")}</td>
                  <td>{u.active ? "Active" : <span className={styles.muted}>Disabled</span>}</td>
                  <td>
                    <Link href={`/admin/users/${u.id}`}>Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
