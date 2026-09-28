"use client";

import { useActionState, useState } from "react";
import { startInspection } from "@/app/actions/inspection";
import styles from "../workflow.module.css";

const OPTIONS = [
  {
    value: "Onsite",
    name: "Onsite Inspection",
    text: "Inspect the material at the customer's site. You will upload or build the inspection list, record inspected quantities, photos and expenses, then proceed to Quotation.",
  },
  {
    value: "Virtual",
    name: "Virtual Inspection",
    text: "No site visit and no inspection data. The PO goes straight to Quotation Preparation.",
  },
];

export default function StartInspection({ poId }) {
  const [state, formAction, pending] = useActionState(startInspection.bind(null, poId), undefined);
  const [type, setType] = useState("");

  return (
    <form action={formAction} className={styles.card}>
      <h2 className={styles.cardTitle}>Select Inspection Type</h2>
      <p className={styles.text}>Every PO needs an inspection type before it can move on.</p>

      <div className={styles.types} role="radiogroup" aria-label="Inspection type">
        {OPTIONS.map((o) => (
          <label key={o.value} className={`${styles.type} ${type === o.value ? styles.typeSelected : ""}`}>
            <input type="radio" name="type" value={o.value} checked={type === o.value} onChange={() => setType(o.value)} />
            <span>
              <div className={styles.typeName}>{o.name}</div>
              <div className={styles.typeText}>{o.text}</div>
            </span>
          </label>
        ))}
      </div>

      <div className={styles.warn}>Starting the inspection locks the customer registration record for this PO.</div>
      {state?.message && (
        <div className={styles.error} role="alert">
          {state.message}
        </div>
      )}
      <button type="submit" className={styles.btnPrimary} disabled={!type || pending}>
        {pending ? "Starting…" : "Start Inspection"}
      </button>
    </form>
  );
}
