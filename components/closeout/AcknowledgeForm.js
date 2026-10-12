"use client";

import { useState, useTransition } from "react";
import { acknowledgeWeighment } from "@/app/actions/closeout";
import shared from "../workflow.module.css";
import styles from "./closeout.module.css";

/** FR-08.04/05: a failed cross-check is cleared only with an explanation, which is kept permanently. */
export default function AcknowledgeForm({ poId }) {
  const [remarks, setRemarks] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    setMessage("");
    if (!remarks.trim()) {
      setMessage("Enter the explanation for the weight difference.");
      return;
    }
    startTransition(async () => {
      const result = await acknowledgeWeighment(poId, remarks.trim());
      if (result?.message) setMessage(result.message);
    });
  }

  return (
    <div className={shared.card}>
      <h2 className={shared.cardTitle}>Explain the difference</h2>
      <p className={shared.text}>
        The PO cannot move on to the AOR and final reports until this is acknowledged with a remark. The remark is kept
        in the audit trail.
      </p>
      {message && (
        <div className={shared.error} role="alert">
          {message}
        </div>
      )}
      <label className={shared.label} htmlFor="wc-remarks">
        Remarks <span className={shared.req}>*</span>
      </label>
      <textarea
        id="wc-remarks"
        className={styles.textarea}
        value={remarks}
        maxLength={1000}
        onChange={(e) => setRemarks(e.target.value)}
      />
      <div className={shared.actions}>
        <button type="button" className={shared.btnPrimary} onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Acknowledge and continue"}
        </button>
      </div>
    </div>
  );
}
