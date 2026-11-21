import PoHeader from "@/components/PoHeader";
import OperationsEditor from "@/components/operations/OperationsEditor";
import OperationsSummary from "@/components/operations/OperationsSummary";
import StartOperations from "@/components/operations/StartOperations";
import shared from "@/components/workflow.module.css";
import { requireRole } from "@/lib/dal";
import { formatDate } from "@/lib/po-constants";
import { getOperationsRecord } from "@/lib/operations";
import { getPickupRequest } from "@/lib/pickup";
import { getPurchaseOrder } from "@/lib/purchase-orders";

export const metadata = { title: "Operations — Cynosure MIS" };

const FLASH = {
  completed: "Operations marked complete. The PO has moved to the Factory stage.",
};

export default async function OperationsPage({ params, searchParams }) {
  const user = await requireRole("BD Team", "Admin", "Operations Team", "Factory Team");
  const { id } = await params;
  const flags = await searchParams;
  const [po, data, pickupData] = await Promise.all([
    getPurchaseOrder(id),
    getOperationsRecord(id),
    getPickupRequest(id),
  ]);
  const o = data.operations;
  const isOperations = user.role === "Operations Team";
  const flash = Object.keys(FLASH).find((key) => flags[key]);
  const scheduledCollectionAt = pickupData.pickup?.collectionDateTime ?? null;

  let body;
  if (!o) {
    if (!data.canStart) {
      body = (
        <div className={shared.card}>
          <p className={shared.text}>
            Operations work becomes available once the Inspection Report has been generated in the Pickup stage.
          </p>
        </div>
      );
    } else if (isOperations) {
      body = <StartOperations poId={id} />;
    } else {
      body = (
        <div className={shared.card}>
          <p className={shared.text}>Operations has not started work on this PO yet.</p>
        </div>
      );
    }
  } else if (o.editable && isOperations) {
    body = <OperationsEditor poId={id} operations={o} scheduledCollectionAt={scheduledCollectionAt} />;
  } else {
    body = (
      <>
        {o.editable && !isOperations && (
          <div className={shared.info}>The Operations team is still working on this record.</div>
        )}
        {o.completedAt && (
          <div className={shared.notice}>
            Completed by {o.completedBy} on {formatDate(o.completedAt)}.
          </div>
        )}
        <OperationsSummary poId={id} operations={o} />
      </>
    );
  }

  return (
    <>
      <PoHeader po={po} tab="operations" role={user.role} />
      {flash && <div className={shared.notice}>{FLASH[flash]}</div>}
      {body}
    </>
  );
}
