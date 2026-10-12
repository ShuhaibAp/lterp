import { requireRole } from "@/lib/dal";
import { getPermissionMatrix } from "@/lib/admin";
import admin from "@/components/admin/admin.module.css";
import styles from "../../purchase-orders/po.module.css";

export const metadata = { title: "Permissions — Cynosure MIS" };

export default async function PermissionsPage() {
  await requireRole("Admin");
  const { roles, rows } = await getPermissionMatrix();

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>Permissions</h1>
          <p className={styles.sub}>
            What each role can do in every area. These rules are enforced by the system: anyone trying something
            outside their role is blocked.
          </p>
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Area</th>
                {roles.map((r) => (
                  <th key={r}>{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.capability}>
                  <td>
                    <strong>{row.capability}</strong>
                  </td>
                  {roles.map((r) => {
                    const cell = row.cells[r];
                    return (
                      <td key={r} className={cell === "—" ? admin.cellNo : admin.cellYes}>
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
