"use client";

import { useState, useTransition } from "react";
import { inviteCustomer } from "@/app/actions/purchase-orders";
import styles from "@/app/(app)/purchase-orders/po.module.css";

const STATUS_TEXT = {
  none: "Not invited yet. The invite is sent automatically when the client's approval is recorded.",
  invited: "Invited. The customer has not set a password yet.",
  active: "Active. The customer can sign in to the customer app.",
};

/** BD / Admin: whether the customer can use the customer app, with a way to (re)send the invite. */
export default function CustomerAccessCard({ poId, email, initialStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [result, setResult] = useState(null);
  const [pending, startTransition] = useTransition();

  function send() {
    setResult(null);
    startTransition(async () => {
      const r = await inviteCustomer(poId);
      if (r?.status) setStatus(r.status);
      setResult(r);
    });
  }

  return (
    <section className={styles.card}>
      <header className={styles.cardHead}>
        <h2 className={styles.cardTitle}>Customer app access</h2>
      </header>
      <p className={styles.fValue}>{STATUS_TEXT[status]}</p>
      <p className={styles.docMeta}>Invite goes to {email}</p>

      {result?.message && <div role="alert">{result.message}</div>}
      {result?.reason && !result.emailed && (
        <div role="alert">
          The email was not sent: {result.reason}
          {result.link && (
            <>
              {" "}
              Give the customer this link instead:
              <input
                readOnly
                value={result.link}
                onFocus={(e) => e.target.select()}
                aria-label="Set-password link"
                style={{ width: "100%", marginTop: 8 }}
              />
            </>
          )}
        </div>
      )}
      {result?.emailed && <p className={styles.docMeta}>Invite email sent.</p>}

      {status !== "active" && (
        <button type="button" className={styles.btn} onClick={send} disabled={pending}>
          {pending ? "Sending…" : status === "invited" ? "Resend invite" : "Send invite"}
        </button>
      )}
    </section>
  );
}
