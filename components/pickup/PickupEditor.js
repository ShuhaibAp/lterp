"use client";

import { useState, useTransition } from "react";
import { generatePickupReport, savePickupRequest } from "@/app/actions/pickup";
import {
  fromDateTimeLocal,
  MAX_CONTACT_NAME,
  MAX_CONTACT_PHONE,
  MAX_INSTRUCTIONS,
  remainingPickupSteps,
  toDateTimeLocal,
} from "@/lib/pickup-constants";
import { autosaveLabel, useAutosave } from "@/lib/use-autosave";
import shared from "../workflow.module.css";
import styles from "./pickup.module.css";

export default function PickupEditor({ poId, pickup }) {
  const [collectionDateTime, setCollectionDateTime] = useState(toDateTimeLocal(pickup.collectionDateTime));
  const [contactName, setContactName] = useState(pickup.contactName);
  const [contactPhone, setContactPhone] = useState(pickup.contactPhone);
  const [poInstructions, setPoInstructions] = useState(pickup.poInstructions);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const steps = remainingPickupSteps({ collectionDateTime, contactName, contactPhone });

  function touched() {
    setMessage(null);
    setConfirming(false);
  }

  function payload() {
    return {
      collectionDateTime: fromDateTimeLocal(collectionDateTime) || undefined,
      contactName,
      contactPhone,
      poInstructions,
    };
  }

  const { status: saveStatus, flush } = useAutosave({
    value: JSON.stringify(payload()),
    onSave: async () => {
      const result = await savePickupRequest(poId, payload());
      if (result?.pickup) {
        setErrors({});
        return true;
      }
      if (result?.errors) {
        setErrors(result.errors);
        setMessage({ kind: "error", text: "Fix the highlighted fields and try again." });
      } else if (result) {
        setMessage({ kind: "error", text: result.message ?? "Something went wrong." });
      }
      return false;
    },
  });

  function generate() {
    setConfirming(false);
    startTransition(async () => {
      const saved = await flush();
      if (!saved) return;
      const result = await generatePickupReport(poId);
      if (result) {
        setMessage({ kind: "error", text: result.message ?? "Something went wrong.", list: result.blockers });
      }
    });
  }

  return (
    <>
      <div className={shared.card}>
        <div className={shared.cardHead}>
          <h2 className={shared.cardTitle}>Collection Details</h2>
        </div>

        <label className={shared.label} htmlFor="pickup-datetime">
          Collection Date &amp; Time <span className={shared.req}>*</span>
        </label>
        <input
          id="pickup-datetime"
          type="datetime-local"
          className={`${shared.cell} ${errors.collectionDateTime ? shared.cellInvalid : ""}`}
          value={collectionDateTime}
          onChange={(e) => {
            setCollectionDateTime(e.target.value);
            touched();
          }}
        />
        {errors.collectionDateTime && <div className={shared.cellError}>{errors.collectionDateTime}</div>}

        <div className={styles.row}>
          <div>
            <label className={shared.label} htmlFor="pickup-contact-name">
              Point of Contact Name <span className={shared.req}>*</span>
            </label>
            <input
              id="pickup-contact-name"
              type="text"
              className={`${shared.cell} ${errors.contactName ? shared.cellInvalid : ""}`}
              value={contactName}
              maxLength={MAX_CONTACT_NAME}
              placeholder="Who the driver should ask for"
              onChange={(e) => {
                setContactName(e.target.value);
                touched();
              }}
            />
            {errors.contactName && <div className={shared.cellError}>{errors.contactName}</div>}
          </div>
          <div>
            <label className={shared.label} htmlFor="pickup-contact-phone">
              Point of Contact Phone <span className={shared.req}>*</span>
            </label>
            <input
              id="pickup-contact-phone"
              type="tel"
              className={`${shared.cell} ${errors.contactPhone ? shared.cellInvalid : ""}`}
              value={contactPhone}
              maxLength={MAX_CONTACT_PHONE}
              placeholder="+91 98765 43210"
              onChange={(e) => {
                setContactPhone(e.target.value);
                touched();
              }}
            />
            {errors.contactPhone && <div className={shared.cellError}>{errors.contactPhone}</div>}
          </div>
        </div>
      </div>

      <div className={shared.card}>
        <div className={shared.cardHead}>
          <h2 className={shared.cardTitle}>
            PO Instructions <span className={shared.optional}>(optional)</span>
          </h2>
        </div>
        <p className={shared.text}>
          Pre-filled from the customer registration. Changes here are saved back to the PO record.
        </p>
        <textarea
          className={`${shared.cell} ${styles.textarea} ${errors.poInstructions ? shared.cellInvalid : ""}`}
          value={poInstructions}
          maxLength={MAX_INSTRUCTIONS}
          placeholder="Special handling notes, site access instructions, etc."
          onChange={(e) => {
            setPoInstructions(e.target.value);
            touched();
          }}
        />
        {errors.poInstructions && <div className={shared.cellError}>{errors.poInstructions}</div>}
      </div>

      {message && (
        <div className={message.kind === "error" ? shared.error : shared.notice} role={message.kind === "error" ? "alert" : "status"}>
          {message.text}
          {message.list && (
            <ul className={shared.list}>
              {message.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {confirming && (
        <div className={shared.confirm} role="alert">
          <span>
            Generating the report locks this pickup request and moves the PO to the Operations stage.
          </span>
          <span className={shared.confirmActions}>
            <button type="button" className={shared.btn} onClick={() => setConfirming(false)}>
              Cancel
            </button>
            <button type="button" className={shared.btnPrimary} onClick={generate} disabled={pending}>
              {pending ? "Working…" : "Confirm & generate"}
            </button>
          </span>
        </div>
      )}

      <div className={shared.actions}>
        <span className={shared.status}>{autosaveLabel(saveStatus)}</span>
        <button
          type="button"
          className={shared.btnPrimary}
          onClick={() => setConfirming(true)}
          disabled={pending || steps.length > 0}
        >
          Generate Inspection Report
        </button>
      </div>
      {steps.length > 0 && (
        <div className={shared.remaining}>
          To generate the report:
          <ul>
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
