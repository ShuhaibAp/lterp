"use client";

import { useState, useTransition } from "react";
import { sendQuotation } from "@/app/actions/quotation";
import shared from "../workflow.module.css";
import styles from "./quotation.module.css";

/** Admin records that the approved quotation was sent to the client (email itself is manual). */
export default function SendToClient({ poId }) {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function send() {
    setMessage("");
    startTransition(async () => {
      const result = await sendQuotation(poId);
      if (result?.message) setMessage(result.message);
    });
  }

  return (
    <div className={shared.card}>
      <h2 className={shared.cardTitle}>Send to Client</h2>
      <p className={`${shared.text} ${styles.lead}`}>
        Download the approved quotation and send it to the client yourself (email is not automated yet), then record it
        here. Recording it moves the PO to the Client Response stage.
      </p>
      {message && (
        <div className={shared.error} role="alert">
          {message}
        </div>
      )}
      {confirming ? (
        <div className={styles.reviewRow}>
          <button type="button" className={shared.btnPrimary} onClick={send} disabled={pending}>
            {pending ? "Working…" : "Confirm: sent to client"}
          </button>
          <button type="button" className={shared.btn} onClick={() => setConfirming(false)} disabled={pending}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" className={shared.btnPrimary} onClick={() => setConfirming(true)}>
          Mark as sent to client
        </button>
      )}
    </div>
  );
}
