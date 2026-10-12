"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createUser, updateUser } from "@/app/actions/admin";
import styles from "./admin.module.css";

export const STAFF_ROLES = ["BD Team", "Operations Team", "Factory Team", "Admin"];

/** Create (mode="create") or edit (mode="edit") a staff account. */
export default function UserForm({ mode, user, isSelf = false }) {
  const isEdit = mode === "edit";
  const [state, action, pending] = useActionState(isEdit ? updateUser.bind(null, user.id) : createUser, undefined);
  const err = state?.errors ?? {};
  // A customer's roles come from the customer-app invite and aren't editable here.
  const rolesLocked = isEdit && user.isCustomer;

  return (
    <form action={action} className={styles.card} noValidate>
      <h2 className={styles.cardTitle}>{isEdit ? "Account details" : "New account"}</h2>
      <p className={styles.hint}>
        {isEdit
          ? "Change the name, the roles or whether the account can sign in."
          : "The person signs in with this email and the password you set. They can hold more than one role."}
      </p>

      {state?.message && !state.errors && (
        <div className={styles.alert} role="alert">
          {state.message}
        </div>
      )}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="name">
          Name
        </label>
        <input id="name" name="name" className={styles.input} defaultValue={user?.name ?? ""} maxLength={100} required />
        {err.name && <div className={styles.fieldError}>{err.name}</div>}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="email">
          Email address
        </label>
        {isEdit ? (
          <div>{user.email}</div>
        ) : (
          <input id="email" name="email" type="email" className={styles.input} maxLength={254} required />
        )}
        {err.email && <div className={styles.fieldError}>{err.email}</div>}
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Roles</span>
        {rolesLocked ? (
          <div>Customer</div>
        ) : (
          <div className={styles.checks}>
            {STAFF_ROLES.map((role) => (
              <label key={role} className={styles.check}>
                <input
                  type="checkbox"
                  name="roles"
                  value={role}
                  defaultChecked={user?.roles.includes(role)}
                  disabled={isSelf && role === "Admin"}
                />
                {role}
              </label>
            ))}
          </div>
        )}
        {isSelf && <input type="hidden" name="roles" value="Admin" />}
        {err.roles && <div className={styles.fieldError}>{err.roles}</div>}
      </div>

      {!isEdit && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            className={styles.input}
            placeholder="At least 8 characters"
            required
          />
          {err.password && <div className={styles.fieldError}>{err.password}</div>}
        </div>
      )}

      {isEdit && (
        <div className={styles.field}>
          <label className={styles.check}>
            <input type="checkbox" name="active" defaultChecked={user.active} disabled={isSelf} />
            Can sign in
          </label>
          {isSelf && <input type="hidden" name="active" value="on" />}
        </div>
      )}

      <div className={styles.actions}>
        <button type="submit" className={styles.btnPrimary} disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create account"}
        </button>
        <Link href="/admin/users" className={styles.btn}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
