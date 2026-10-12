"use client";

import { useState, useTransition } from "react";
import { sendAor } from "@/app/actions/closeout";
import shared from "../workflow.module.css";

export default function SendAorButton({ poId }) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <>
      {message && (
        <div className={shared.error} role="alert">
          {message}
        </div>
      )}
      <button
        type="button"
        className={shared.btnPrimary}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await sendAor(poId);
            if (result?.message) setMessage(result.message);
          })
        }
      >
        {pending ? "Saving…" : "Mark as sent to client"}
      </button>
    </>
  );
}
