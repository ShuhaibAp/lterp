import InspectionEditor from "@/components/inspection/InspectionEditor";
import InspectionReadOnly from "@/components/inspection/InspectionReadOnly";
import StartInspection from "@/components/inspection/StartInspection";
import styles from "@/components/workflow.module.css";
import PoHeader from "@/components/PoHeader";
import { requireRole } from "@/lib/dal";
import { getInspection, getUoms } from "@/lib/inspection";
import { getPurchaseOrder } from "@/lib/purchase-orders";

export const metadata = { title: "Inspection — Lifecycle & Traceability ERP" };

export default async function InspectionPage({ params, searchParams }) {
  const user = await requireRole("BD Team", "Admin", "Operations Team", "Factory Team");
  const { id } = await params;
  const { completed } = await searchParams;
  const [po, { inspection }] = await Promise.all([getPurchaseOrder(id), getInspection(id)]);
  const isBd = user.role === "BD Team";

  let body;
  if (!inspection) {
    body = isBd ? (
      <StartInspection poId={id} />
    ) : (
      <div className={styles.card}>
        <p className={styles.text}>The BD team has not started the inspection for this PO yet.</p>
      </div>
    );
  } else if (inspection.type === "Virtual") {
    body = (
      <div className={styles.info}>
        Virtual inspection — no inspection data is required. This PO went directly to Quotation Preparation.
      </div>
    );
  } else if (inspection.editable && isBd) {
    body = <InspectionEditor poId={id} initial={inspection} uoms={await getUoms()} />;
  } else {
    body = (
      <>
        {inspection.editable && <div className={styles.info}>The BD team is still working on this inspection.</div>}
        <InspectionReadOnly poId={id} inspection={inspection} canEditRemarks={isBd} />
      </>
    );
  }

  return (
    <>
      <PoHeader po={po} tab="inspection" role={user.role} />
      {completed && (
        <div className={styles.notice}>Inspection completed. The PO has moved to the Quotation stage.</div>
      )}
      {body}
    </>
  );
}
