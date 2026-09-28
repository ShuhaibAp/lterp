import { formatDate } from "@/lib/po-constants";
import { formatQuantity } from "@/lib/inspection-constants";
import { COLLECTION_FIELDS } from "@/lib/operations-constants";
import shared from "../workflow.module.css";
import ExpenseTable from "./ExpenseTable";
import Form6Document from "./Form6Document";
import { GeoPhotoGallery } from "./OperationsPhotos";
import styles from "./operations.module.css";

/** Read-only view of a completed (or in-progress, for BD/Admin) Operations record. */
export default function OperationsSummary({ poId, operations }) {
  return (
    <>
      <div className={shared.card}>
        <div className={shared.cardHead}>
          <h2 className={shared.cardTitle}>Collection Details</h2>
        </div>
        <ul className={styles.summaryList}>
          <li className={styles.summaryRow}>
            <span>Inspection Report acknowledged</span>
            <span>{operations.acknowledged ? `Yes – by ${operations.acknowledgedBy}` : "Not yet"}</span>
          </li>
          <li className={styles.summaryRow}>
            <span>Pickup Date</span>
            <span>{operations.pickupDate ? formatDate(operations.pickupDate) : "—"}</span>
          </li>
          {COLLECTION_FIELDS.map((f) => (
            <li key={f.key} className={styles.summaryRow}>
              <span>{f.label}</span>
              <span>
                {f.type === "date"
                  ? operations[f.key]
                    ? formatDate(operations[f.key])
                    : "—"
                  : f.type === "money"
                    ? operations[f.key] === null
                      ? "—"
                      : `₹${operations[f.key]}`
                    : f.type === "weight"
                      ? operations[f.key] === null
                        ? "—"
                        : `${operations[f.key]} kg`
                      : operations[f.key] || "—"}
              </span>
            </li>
          ))}
          {operations.netWeightKg !== null && (
            <li className={styles.summaryRow}>
              <span>Net Weight (Loaded − Empty)</span>
              <span>{operations.netWeightKg} kg</span>
            </li>
          )}
        </ul>
        <Form6Document poId={poId} document={operations.form6Document} editable={false} />
      </div>

      <div className={shared.card}>
        <div className={shared.cardHead}>
          <h2 className={shared.cardTitle}>Materials</h2>
        </div>
        <div className={shared.scroll}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Material</th>
                <th>UoM</th>
                <th className={shared.right}>Client Qty</th>
                <th className={shared.right}>Inspected Qty</th>
                <th className={shared.right}>Actual Qty</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {operations.lines.map((l) => {
                const differs = l.actualQuantity !== null && l.actualQuantity !== l.inspectedQuantity;
                return (
                  <tr key={l.id} className={differs ? styles.discrepancy : undefined}>
                    <td className={shared.plain}>{l.materialName}</td>
                    <td className={shared.plain}>{l.uom}</td>
                    <td className={`${shared.plain} ${shared.right}`}>{formatQuantity(l.clientQuantity)}</td>
                    <td className={`${shared.plain} ${shared.right}`}>{formatQuantity(l.inspectedQuantity)}</td>
                    <td className={`${shared.plain} ${shared.right}`}>
                      {l.actualQuantity === null ? "—" : formatQuantity(l.actualQuantity)}
                    </td>
                    <td className={shared.plain}>{l.remarks || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {operations.lines.length === 0 && <div className={shared.emptyRows}>No materials were recorded for this PO.</div>}
        </div>
      </div>

      {operations.photos.length > 0 && (
        <div className={shared.card}>
          <div className={shared.cardHead}>
            <h2 className={shared.cardTitle}>Geotagged Photos</h2>
          </div>
          <GeoPhotoGallery poId={poId} photos={operations.photos} />
        </div>
      )}

      <ExpenseTable title="Collection Expenses" editable={false} initialLines={operations.collectionExpenses} onSave={null} />
      <ExpenseTable title="Logistics Expenses" editable={false} initialLines={operations.logisticsExpenses} onSave={null} />
    </>
  );
}
