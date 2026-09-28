import { formatMoney } from "@/lib/inspection-constants";
import { formatDate } from "@/lib/po-constants";
import shared from "../workflow.module.css";
import styles from "./quotation.module.css";

const DECISION_TONE = {
  Approved: styles.decisionApproved,
  Rejected: styles.decisionRejected,
  "Revision Required": styles.decisionRevisionRequired,
};

/** FR-04.07 / AC-04.04: every quotation version stays visible, oldest first. */
export default function VersionHistory({ versions }) {
  if (!versions || versions.length < 2) return null;

  return (
    <div className={shared.card}>
      <h2 className={shared.cardTitle}>Version History</h2>
      <ul className={styles.historyList}>
        {versions.map((v) => (
          <li key={v.version} className={styles.historyRow}>
            <span className={styles.historyVersion}>
              v{v.version}
              {v.current && <span className={styles.historyCurrent}>current</span>}
            </span>
            <span className={styles.historyAmount}>{formatMoney(v.grandTotal)}</span>
            <span className={styles.historyStatus}>
              {v.clientDecision ? (
                <strong className={DECISION_TONE[v.clientDecision]}>{v.clientDecision}</strong>
              ) : (
                v.status
              )}
            </span>
            <span className={styles.historyDate}>
              {v.clientDecisionAt
                ? formatDate(v.clientDecisionAt)
                : v.sentAt
                  ? `Sent ${formatDate(v.sentAt)}`
                  : v.submittedAt
                    ? `Submitted ${formatDate(v.submittedAt)}`
                    : "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
