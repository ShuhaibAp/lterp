import LockIcon from "../LockIcon";
import styles from "./quotation.module.css";

/** The PDF is locked until Admin approves; once approved it can be downloaded. */
export default function DownloadCard({ poId, unlocked }) {
  if (!unlocked) {
    return (
      <div className={styles.lockCard}>
        <LockIcon size={14} color="#62615d" />
        The PDF download is locked until Admin approves this quotation.
      </div>
    );
  }
  return (
    <div className={styles.downloadCard}>
      <span>Approved. The quotation PDF is ready to download.</span>
      <a className={styles.linkButton} href={`/purchase-orders/${poId}/quotation/download`}>
        Download PDF
      </a>
    </div>
  );
}
