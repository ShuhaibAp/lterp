"use client";

import { useActionState } from "react";
import { startOperations } from "@/app/actions/operations";
import styles from "../workflow.module.css";

export default function StartOperations({ poId }) {
  const [state, formAction, pending] = useActionState(startOperations.bind(null, poId), undefined);

  return (
    <form action={formAction} className={styles.card}>
      <h2 className={styles.cardTitle}>Operations</h2>
      <p className={styles.text}>
        The Inspection Report has been generated. Review it, then record the collection details and any discrepancies
        between the inspected and actual quantities.
      </p>
      {state?.message && (
        <div className={styles.error} role="alert">
          {state.message}
        </div>
      )}
      <button type="submit" className={styles.btnPrimary} disabled={pending}>
        {pending ? "Starting…" : "Start Operations"}
      </button>
    </form>
  );
}
