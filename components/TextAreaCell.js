"use client";

import { useEffect, useRef } from "react";
import styles from "./workflow.module.css";

/** A table-cell textarea that grows to fit its content, for longer free-text fields like remarks. */
export default function TextAreaCell({ error, value, ...props }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <>
      <textarea
        ref={ref}
        className={`${styles.cell} ${styles.remarksCell} ${error ? styles.cellInvalid : ""}`}
        aria-invalid={!!error}
        value={value}
        rows={1}
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
