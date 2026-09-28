"use client";

import { useState, useTransition } from "react";
import { startRevision } from "@/app/actions/quotation";
import { formatMoney } from "@/lib/inspection-constants";
import shared from "../workflow.module.css";
import styles from "./quotation.module.css";

/** Module 4 (FR-04.04/05): the client asked for changes. BD starts the next version, pre-populated from this one. */
export default function StartRevision({ poId, prevVersion, prevTotal, note }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function run() {
    setMessage("");
    startTransition(async () => {
      const result = await startRevision(poId);
      if (result?.message) setMessage(result.message);
    });
  }

  return (
    <div className={shared.card}>
      <h2 className={shared.cardTitle}>Revision Requested</h2>
      <p className={`${shared.text} ${styles.lead}`}>
        The client asked for changes to v{prevVersion} ({formatMoney(prevTotal)}).
        {note ? ` Their note: “${note}”` : ""}
      </p>
      {message && (
        <div className={shared.error} role="alert">
          {message}
        </div>
      )}
      <button type="button" className={shared.btnPrimary} onClick={run} disabled={pending}>
        {pending ? "Starting…" : `Start Revision (v${prevVersion + 1})`}
      </button>
    </div>
  );
}
