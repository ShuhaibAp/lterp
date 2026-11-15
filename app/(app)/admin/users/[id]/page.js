import ResetPasswordForm from "@/components/admin/ResetPasswordForm";
import UserForm from "@/components/admin/UserForm";
import { getUser } from "@/lib/admin";
import { requireRole } from "@/lib/dal";
import styles from "../../../purchase-orders/po.module.css";

export const metadata = { title: "Edit user — Lifecycle & Traceability ERP" };

export default async function EditUserPage({ params }) {
  const me = await requireRole("Admin");
  const { id } = await params;
  const user = await getUser(id);

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>{user.name}</h1>
          <p className={styles.sub}>{user.email}</p>
        </div>
      </div>
      <UserForm mode="edit" user={user} isSelf={user.id === me.id} />
      <ResetPasswordForm userId={user.id} />
    </>
  );
}
