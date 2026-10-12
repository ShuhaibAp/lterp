"use client";

import { useActionState } from "react";
import { resetPassword } from "@/app/actions/admin";
import styles from "./admin.module.css";

/** Admin sets a new password for someone who has lost theirs. */
export default function ResetPasswordForm({ userId }) {
  const [state, action, pending] = useActionState(resetPassword.bind(null, userId), undefined);

  return (
    <form action={action} className={styles.card} noValidate>
      <h2 className={styles.cardTitle}>Reset password</h2>
      <p className={styles.hint}>Set a new password and share it with the person. Their current password stops working.</p>

      {state?.done && (
        <div className={styles.ok} role="status">
          Password changed.
        </div>
      )}
      {state?.message && (
        <div className={styles.alert} role="alert">
          {state.message}
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="new-password">
          New password
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          className={styles.input}
          placeholder="At least 8 characters"
          required
        />
      </div>
      <button type="submit" className={styles.btn} disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
