"use client";

import { useActionState } from "react";
import { startPickupRequest } from "@/app/actions/pickup";
import styles from "../workflow.module.css";

export default function StartPickup({ poId }) {
  const [state, formAction, pending] = useActionState(startPickupRequest.bind(null, poId), undefined);

  return (
    <form action={formAction} className={styles.card}>
      <h2 className={styles.cardTitle}>Material Pickup Request</h2>
      <p className={styles.text}>
        The client has approved this quotation. Schedule the collection and the system will generate the Inspection
        Report that hands this PO off to Operations.
      </p>
      {state?.message && (
        <div className={styles.error} role="alert">
          {state.message}
        </div>
      )}
      <button type="submit" className={styles.btnPrimary} disabled={pending}>
        {pending ? "Starting…" : "Start Pickup Request"}
      </button>
    </form>
  );
}
