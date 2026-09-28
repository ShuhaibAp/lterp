"use client";

import { useState, useTransition } from "react";
import { recordClientResponse } from "@/app/actions/quotation";
import { MAX_NOTE } from "@/lib/quotation-math";
import shared from "../workflow.module.css";
import styles from "./quotation.module.css";

const OPTIONS = [
  { value: "Approved", label: "Approved", hint: "The client accepted this quotation as is." },
  { value: "Revision Required", label: "Revision Required", hint: "The client wants changes. This sends it back to BD." },
  { value: "Rejected", label: "Rejected", hint: "The client declined. This closes the PO." },
];

/** Module 4: BD or Admin records the client's decision on the quotation that was sent to them. */
export default function ClientResponseForm({ poId }) {
  const [decision, setDecision] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const noteRequired = decision === "Rejected";

  function submit() {
    setMessage("");
    if (!decision) {
      setMessage("Select what the client decided.");
      return;
    }
    if (noteRequired && !note.trim()) {
      setMessage("Enter the reason the client rejected this quotation.");
      return;
    }
    startTransition(async () => {
      const result = await recordClientResponse(poId, decision, note.trim());
      if (result?.message) setMessage(result.message);
      else if (result?.errors) setMessage(Object.values(result.errors)[0]);
    });
  }

  return (
    <div className={shared.card}>
      <h2 className={shared.cardTitle}>Client Response</h2>
      <p className={`${shared.text} ${styles.lead}`}>
        Record what the client said about this quotation (by phone, email or their own confirmation).
      </p>

      {message && (
        <div className={shared.error} role="alert">
          {message}
        </div>
      )}

      <div className={styles.decisionOptions}>
        {OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`${styles.decisionOption} ${decision === opt.value ? styles.decisionSelected : ""}`}
          >
            <input
              type="radio"
              name="decision"
              value={opt.value}
              checked={decision === opt.value}
              onChange={() => setDecision(opt.value)}
            />
            <span>
              <strong className={styles[`decision${opt.value.replace(/\s/g, "")}`]}>{opt.label}</strong>
              <span className={styles.decisionHint}>{opt.hint}</span>
            </span>
          </label>
        ))}
      </div>

      {decision && (
        <>
          <label className={shared.label} htmlFor="client-note">
            Note {noteRequired ? <span className={shared.req}>*</span> : <span className={shared.optional}>(optional)</span>}
          </label>
          <textarea
            id="client-note"
            className={`${shared.cell} ${styles.noteBox}`}
            value={note}
            maxLength={MAX_NOTE}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              noteRequired ? "Why did the client reject this quotation?" : "What should change? (optional)"
            }
          />
        </>
      )}

      <div className={styles.reviewRow}>
        <button type="button" className={shared.btnPrimary} onClick={submit} disabled={pending || !decision}>
          {pending ? "Saving…" : "Save Client Response"}
        </button>
      </div>
    </div>
  );
}
