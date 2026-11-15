import UserForm from "@/components/admin/UserForm";
import { requireRole } from "@/lib/dal";
import styles from "../../../purchase-orders/po.module.css";

export const metadata = { title: "New user — Lifecycle & Traceability ERP" };

export default async function NewUserPage() {
  await requireRole("Admin");

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>New user</h1>
          <p className={styles.sub}>Create an account for a BD, Operations, Factory or Admin team member.</p>
        </div>
      </div>
      <UserForm mode="create" />
    </>
  );
}
