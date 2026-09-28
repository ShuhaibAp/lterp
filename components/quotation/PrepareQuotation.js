"use client";

import { useActionState } from "react";
import { prepareQuotation } from "@/app/actions/quotation";
import styles from "../workflow.module.css";
import own from "./quotation.module.css";

export default function PrepareQuotation({ poId, inspectionType }) {
  const [state, formAction, pending] = useActionState(prepareQuotation.bind(null, poId), undefined);
  const virtual = inspectionType === "Virtual";

  return (
    <form action={formAction} className={styles.card}>
      <h2 className={styles.cardTitle}>Prepare Quotation</h2>
      <p className={`${styles.text} ${own.lead}`}>
        {virtual
          ? "This PO had a virtual inspection, so there are no inspected materials to copy. You will add the quotation items yourself, then price them."
          : "The materials and inspected quantities from the completed inspection will be copied in. You then enter a unit price for each item."}
      </p>
      {state?.message && (
        <div className={styles.error} role="alert">
          {state.message}
        </div>
      )}
      <button type="submit" className={styles.btnPrimary} disabled={pending}>
        {pending ? "Preparing…" : "Prepare Quotation"}
      </button>
    </form>
  );
}
