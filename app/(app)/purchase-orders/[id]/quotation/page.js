import PoHeader from "@/components/PoHeader";
import ClientResponseForm from "@/components/quotation/ClientResponseForm";
import DownloadCard from "@/components/quotation/DownloadCard";
import PrepareQuotation from "@/components/quotation/PrepareQuotation";
import QuotationEditor from "@/components/quotation/QuotationEditor";
import QuotationStatus from "@/components/quotation/QuotationStatus";
import QuotationSummary from "@/components/quotation/QuotationSummary";
import SendToClient from "@/components/quotation/SendToClient";
import StartRevision from "@/components/quotation/StartRevision";
import VersionHistory from "@/components/quotation/VersionHistory";
import styles from "@/components/quotation/quotation.module.css";
import shared from "@/components/workflow.module.css";
import { requireRole } from "@/lib/dal";
import { formatDate } from "@/lib/po-constants";
import { getPurchaseOrder } from "@/lib/purchase-orders";
import { getUoms } from "@/lib/inspection";
import { getQuotation } from "@/lib/quotation";

export const metadata = { title: "Quotation — Cynosure MIS" };

const FLASH = {
  submitted: "Quotation submitted for Admin approval.",
  approved: "Quotation approved. The PDF download is now unlocked.",
  returned: "Quotation returned to BD for revision.",
  sent: "Recorded as sent to the client. The PO has moved to the Client Response stage.",
  clientApproved: "Client approved the quotation. The PO has moved to Pickup.",
  clientRejected: "Client rejected the quotation. The PO is now closed.",
  revisionRequested: "Recorded. The PO has moved back to Quotation Preparation.",
  revisionStarted: "Revision started. Prior pricing was copied in and is now editable.",
};

export default async function QuotationPage({ params, searchParams }) {
  const user = await requireRole("BD Team", "Admin");
  const { id } = await params;
  const flags = await searchParams;
  const [po, data] = await Promise.all([getPurchaseOrder(id), getQuotation(id)]);
  const q = data.quotation;
  const isBd = user.role === "BD Team";
  const isAdmin = user.role === "Admin";
  const flash = Object.keys(FLASH).find((key) => flags[key]);

  let body;
  if (!q) {
    if (!data.canPrepare) {
      body = (
        <div className={shared.card}>
          <p className={shared.text}>The quotation becomes available once the inspection is complete.</p>
        </div>
      );
    } else if (isBd) {
      body = <PrepareQuotation poId={id} inspectionType={data.inspectionType} />;
    } else {
      body = (
        <div className={shared.card}>
          <p className={shared.text}>The BD team has not started the quotation for this PO yet.</p>
        </div>
      );
    }
  } else if (q.editable) {
    // `editable` is already role-aware: BD on a draft/returned quotation, Admin on a submitted one.
    body = (
      <>
        <div className={styles.statusRow}>
          <QuotationStatus status={q.status} />
          <span className={styles.meta}>
            Version {q.version}
            {isAdmin && q.submittedAt && ` · Submitted by ${q.submittedBy} on ${formatDate(q.submittedAt)}`}
            {q.adminEditedAt && ` · Edited by ${q.adminEditedBy} on ${formatDate(q.adminEditedAt)}`}
          </span>
        </div>
        <DownloadCard poId={id} unlocked={false} />
        <QuotationEditor poId={id} quotation={q} uoms={await getUoms()} reviewing={isAdmin} />
      </>
    );
  } else {
    body = (
      <>
        <div className={styles.statusRow}>
          <QuotationStatus status={q.status} />
          <span className={styles.meta}>
            Version {q.version}
            {q.submittedAt && ` · Submitted by ${q.submittedBy} on ${formatDate(q.submittedAt)}`}
            {q.adminEditedAt && ` · Edited by ${q.adminEditedBy} on ${formatDate(q.adminEditedAt)}`}
            {q.status === "Approved" && ` · Approved by ${q.reviewedBy} on ${formatDate(q.reviewedAt)}`}
          </span>
        </div>

        {isAdmin && (q.status === "Draft" || q.status === "Returned") && (
          <div className={shared.info}>The BD team is preparing this quotation.</div>
        )}
        {q.status === "Submitted" && isBd && (
          <div className={shared.info}>Waiting for Admin approval. You cannot edit the quotation while it is under review.</div>
        )}
        {q.sentAt && (
          <div className={shared.notice}>
            Sent to the client by {q.sentBy} on {formatDate(q.sentAt)}.
          </div>
        )}

        {q.clientDecision && (
          <div
            className={
              q.clientDecision === "Approved" ? shared.notice : q.clientDecision === "Rejected" ? shared.error : shared.warn
            }
          >
            Client response: <strong>{q.clientDecision}</strong> — recorded by {q.clientDecisionBy} on{" "}
            {formatDate(q.clientDecisionAt)}.{q.clientDecisionNote && ` “${q.clientDecisionNote}”`}
          </div>
        )}

        <DownloadCard poId={id} unlocked={q.canDownload} />
        <QuotationSummary poId={id} quotation={q} />
        {q.status === "Approved" && isAdmin && !q.sentAt && <SendToClient poId={id} />}
        {q.canRecordClientResponse && (isBd || isAdmin) && <ClientResponseForm poId={id} />}
        {q.canStartRevision && isBd && (
          <StartRevision poId={id} prevVersion={q.version} prevTotal={q.grandTotal} note={q.clientDecisionNote} />
        )}
      </>
    );
  }

  return (
    <>
      <PoHeader po={po} tab="quotation" role={user.role} />
      {flash && <div className={shared.notice}>{FLASH[flash]}</div>}
      {body}
      {q && <VersionHistory versions={q.versions} />}
    </>
  );
}
