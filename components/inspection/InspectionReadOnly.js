"use client";

import { useState } from "react";
import { saveInspectionRemarks } from "@/app/actions/inspection";
import { formatMoney, formatQuantity, MAX_REMARKS } from "@/lib/inspection-constants";
import { formatDate } from "@/lib/po-constants";
import { autosaveLabel, useAutosave } from "@/lib/use-autosave";
import TextAreaCell from "../TextAreaCell";
import { PhotoGallery } from "./InspectionPhotos";
import styles from "../workflow.module.css";

const remarkMap = (lines) => Object.fromEntries(lines.map((l) => [l.id, l.remarks]));

export default function InspectionReadOnly({ poId, inspection, canEditRemarks }) {
  const [saved, setSaved] = useState(() => remarkMap(inspection.lines));
  const [remarks, setRemarks] = useState(saved);
  const [message, setMessage] = useState(null);

  const { status: saveStatus } = useAutosave({
    value: JSON.stringify(remarks),
    onSave: async () => {
      const changed = inspection.lines.filter((l) => remarks[l.id] !== saved[l.id]);
      if (changed.length === 0) return true;
      const found = changed.find((l) => remarks[l.id].length > MAX_REMARKS);
      if (found) {
        setMessage({ kind: "error", text: `Remarks must be ${MAX_REMARKS} characters or fewer.` });
        return false;
      }
      const result = await saveInspectionRemarks(poId, {
        lines: changed.map((l) => ({ id: l.id, remarks: remarks[l.id] })),
      });
      if (result.ok) {
        setSaved(remarks);
        setMessage(null);
        return true;
      }
      setMessage({ kind: "error", text: result.errors ? `Remarks must be ${MAX_REMARKS} characters or fewer.` : result.message });
      return false;
    },
  });

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Inspection List</h2>
        </div>
        {inspection.acknowledgedAt && (
          <p className={styles.meta}>
            Acknowledged by {inspection.acknowledgedBy} on {formatDate(inspection.acknowledgedAt)}
          </p>
        )}
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Material Name</th>
                <th>UoM</th>
                <th className={styles.right}>Client Quantity</th>
                <th className={styles.right}>Inspected Quantity</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {inspection.lines.map((line, i) => (
                <tr key={line.id}>
                  <td className={styles.plain}>{line.materialName}</td>
                  <td className={styles.plain}>{line.uom}</td>
                  <td className={`${styles.plain} ${styles.right}`}>{formatQuantity(line.clientQuantity)}</td>
                  <td className={`${styles.plain} ${styles.right}`}>{formatQuantity(line.inspectedQuantity)}</td>
                  <td>
                    {canEditRemarks ? (
                      <TextAreaCell
                        value={remarks[line.id]}
                        maxLength={MAX_REMARKS}
                        onChange={(e) => {
                          setRemarks((prev) => ({ ...prev, [line.id]: e.target.value }));
                          setMessage(null);
                        }}
                        placeholder="Add remark"
                        aria-label={`Remarks, row ${i + 1}`}
                      />
                    ) : (
                      <span className={styles.plain}>{line.remarks || "—"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canEditRemarks && (
          <div className={`${styles.actions} ${styles.actionsTop}`}>
            {message && (
              <span className={styles.fileProblem} role="status">
                {message.text}
              </span>
            )}
            <span className={styles.status}>{autosaveLabel(saveStatus)}</span>
          </div>
        )}
      </div>

      {inspection.photos.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Inspection Photos</h2>
          </div>
          <PhotoGallery poId={poId} photos={inspection.photos} />
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Inspection Expense</h2>
        </div>
        <div className={styles.expenseValue}>
          {inspection.expenseTotal === null ? "—" : formatMoney(inspection.expenseTotal)}
        </div>
      </div>
    </>
  );
}
