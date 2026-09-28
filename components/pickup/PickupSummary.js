import { formatDate } from "@/lib/po-constants";
import shared from "../workflow.module.css";
import styles from "./pickup.module.css";

/** Read-only view of a pickup request: collection details and PO instructions. */
export default function PickupSummary({ pickup }) {
  return (
    <>
      <div className={shared.card}>
        <div className={shared.cardHead}>
          <h2 className={shared.cardTitle}>Collection Details</h2>
        </div>
        <ul className={styles.summaryList}>
          <li className={styles.summaryRow}>
            <span>Collection date &amp; time</span>
            <span>{pickup.collectionDateTime ? formatDate(pickup.collectionDateTime) : "—"}</span>
          </li>
          <li className={styles.summaryRow}>
            <span>Point of contact</span>
            <span>
              {pickup.contactName || "—"}
              {pickup.contactPhone ? ` · ${pickup.contactPhone}` : ""}
            </span>
          </li>
        </ul>
      </div>

      <div className={shared.card}>
        <div className={shared.cardHead}>
          <h2 className={shared.cardTitle}>
            PO Instructions <span className={shared.optional}>(optional)</span>
          </h2>
        </div>
        <p className={styles.instructions}>{pickup.poInstructions || "None."}</p>
      </div>
    </>
  );
}
