import styles from "./workflow.module.css";

/** A table-cell text input with its own inline error message. */
export default function Cell({ error, numeric, ...props }) {
  return (
    <>
      <input
        className={`${styles.cell} ${numeric ? styles.num : ""} ${error ? styles.cellInvalid : ""}`}
        aria-invalid={!!error}
        {...props}
      />
      {error && (
        <div className={styles.cellError} role="alert">
          {error}
        </div>
      )}
    </>
  );
}
