import LockIcon from "../LockIcon";
import styles from "./pickup.module.css";

/** The Inspection Report is only produced once the pickup request has been generated (FR-05.07). */
export default function ReportCard({ poId, unlocked }) {
  if (!unlocked) {
    return (
      <div className={styles.lockCard}>
        <LockIcon size={14} color="#62615d" />
        The Inspection Report is available once this pickup request is generated.
      </div>
    );
  }
  return (
    <div className={styles.reportCard}>
      <span>Generated. The Inspection Report is ready to download and print.</span>
      <a className={styles.linkButton} href={`/purchase-orders/${poId}/pickup/report`}>
        Download Report
      </a>
    </div>
  );
}
