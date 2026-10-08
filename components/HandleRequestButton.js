"use client";

import { useState, useTransition } from "react";
import { markRequestHandled } from "@/app/actions/order-requests";
import styles from "@/app/(app)/purchase-orders/po.module.css";

export default function HandleRequestButton({ id }) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function handle() {
    setMessage("");
    startTransition(async () => {
      const result = await markRequestHandled(id);
      if (result?.message) setMessage(result.message);
    });
  }

  return (
    <>
      <button type="button" className={styles.btn} onClick={handle} disabled={pending}>
        {pending ? "Saving…" : "Mark handled"}
      </button>
      {message && <span role="alert">{message}</span>}
    </>
  );
}
