"use client";

import { useActionState } from "react";
import { startFactory } from "@/app/actions/factory";
import styles from "../workflow.module.css";

export default function StartFactory({ poId }) {
  const [state, formAction, pending] = useActionState(startFactory.bind(null, poId), undefined);

  return (
    <form action={formAction} className={styles.card}>
      <h2 className={styles.cardTitle}>Factory</h2>
      <p className={styles.text}>
        Operations has delivered this order. Weigh the vehicle, upload both weighment slips, and record what was
        processed for each material.
      </p>
      {state?.message && (
        <div className={styles.error} role="alert">
          {state.message}
        </div>
      )}
      <button type="submit" className={styles.btnPrimary} disabled={pending}>
        {pending ? "Starting…" : "Start Factory processing"}
      </button>
    </form>
  );
}
