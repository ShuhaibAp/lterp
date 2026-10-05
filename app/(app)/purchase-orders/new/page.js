import PoForm from "@/components/PoForm";
import { requireRole } from "@/lib/dal";
import { getServiceTypes } from "@/lib/purchase-orders";
import styles from "../po.module.css";

export const metadata = { title: "New PO — Cynosure MIS" };

export default async function NewPurchaseOrderPage() {
  await requireRole("BD Team");
  const serviceTypes = await getServiceTypes();

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>New PO — Customer Registration</h1>
          <p className={styles.sub}>
            Register a new customer purchase order. Fields marked <span className={styles.required}>*</span> are
            required.
          </p>
        </div>
      </div>
      <PoForm mode="create" serviceTypes={serviceTypes} />
    </>
  );
}
