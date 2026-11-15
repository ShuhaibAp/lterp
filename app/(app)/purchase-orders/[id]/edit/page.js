import { redirect } from "next/navigation";
import PoForm from "@/components/PoForm";
import { requireRole } from "@/lib/dal";
import { getCustomerAccess, getPurchaseOrder, getServiceTypes } from "@/lib/purchase-orders";
import styles from "../../po.module.css";

export const metadata = { title: "Edit PO — Lifecycle & Traceability ERP" };

export default async function EditPurchaseOrderPage({ params }) {
  await requireRole("BD Team");
  const { id } = await params;
  const [po, serviceTypes] = await Promise.all([getPurchaseOrder(id), getServiceTypes()]);
  if (po.locked) redirect(`/purchase-orders/${id}`);
  // A customer with a customer-app login keeps their name and email; only the rest can change.
  const { status } = await getCustomerAccess(id);

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>Edit {po.poNumber}</h1>
          <p className={styles.sub}>
            This record can be edited until the PO moves to the Inspection stage.
          </p>
        </div>
      </div>
      <PoForm mode="edit" po={po} serviceTypes={serviceTypes} customerLocked={status === "active"} />
    </>
  );
}
