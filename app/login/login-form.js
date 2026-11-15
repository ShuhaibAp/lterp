"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { STAFF_ROLES } from "@/lib/po-constants";
import styles from "./login.module.css";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className={styles.form} noValidate>
      {state?.error && (
        <div className={styles.error} role="alert">
          {state.error}
        </div>
      )}

      <label className={styles.field}>
        <span className={styles.label}>Role</span>
        <select className={styles.input} name="role" defaultValue={state?.role ?? ""} required>
          <option value="" disabled>
            Select your role
          </option>
          {STAFF_ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Email address</span>
        <input
          className={styles.input}
          name="email"
          type="email"
          autoComplete="username"
          placeholder="you@company.com"
          defaultValue={state?.email ?? ""}
          autoFocus
          required
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Password</span>
        <input
          className={styles.input}
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
        />
      </label>

      <button className={styles.button} type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
