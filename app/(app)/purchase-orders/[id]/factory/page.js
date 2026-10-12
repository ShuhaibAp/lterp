import PoHeader from "@/components/PoHeader";
import FactoryEditor from "@/components/factory/FactoryEditor";
import FactorySummary from "@/components/factory/FactorySummary";
import StartFactory from "@/components/factory/StartFactory";
import shared from "@/components/workflow.module.css";
import { requireRole } from "@/lib/dal";
import { getFactoryRecord } from "@/lib/factory";
import { formatDate } from "@/lib/po-constants";
import { getPurchaseOrder } from "@/lib/purchase-orders";

export const metadata = { title: "Factory — Cynosure MIS" };

const FLASH = {
  completed: "Factory marked complete. The PO has moved to the Weighment stage.",
};

export default async function FactoryPage({ params, searchParams }) {
  const user = await requireRole("BD Team", "Admin", "Operations Team", "Factory Team");
  const { id } = await params;
  const flags = await searchParams;
  const [po, data] = await Promise.all([getPurchaseOrder(id), getFactoryRecord(id)]);
  const f = data.factory;
  const isFactory = user.role === "Factory Team";
  const flash = Object.keys(FLASH).find((key) => flags[key]);

  let body;
  if (!f) {
    if (!data.canStart) {
      body = (
        <div className={shared.card}>
          <p className={shared.text}>Factory work becomes available once Operations has been marked complete.</p>
        </div>
      );
    } else if (isFactory) {
      body = <StartFactory poId={id} />;
    } else {
      body = (
        <div className={shared.card}>
          <p className={shared.text}>The Factory team has not started work on this PO yet.</p>
        </div>
      );
    }
  } else if (f.editable && isFactory) {
    body = <FactoryEditor poId={id} factory={f} />;
  } else {
    body = (
      <>
        {f.editable && <div className={shared.info}>The Factory team is still working on this record.</div>}
        {f.completedAt && (
          <div className={shared.notice}>
            Completed by {f.completedBy} on {formatDate(f.completedAt)}.
          </div>
        )}
        <FactorySummary poId={id} factory={f} canWriteTeardownLog={data.canWriteTeardownLog} />
      </>
    );
  }

  return (
    <>
      <PoHeader po={po} tab="factory" role={user.role} />
      {flash && <div className={shared.notice}>{FLASH[flash]}</div>}
      {/* FR-07.02: PO Instructions, read-only and prominent, as last edited in the Pickup Request. */}
      {f || data.canStart ? (
        <div className={shared.info}>
          <strong>PO Instructions:</strong> {data.poInstructions || "None"}
        </div>
      ) : null}
      {body}
    </>
  );
}
