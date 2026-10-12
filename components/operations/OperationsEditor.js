"use client";

import { useMemo, useState, useTransition } from "react";
import {
  completeOperations,
  saveCollectionExpenses,
  saveLogisticsExpenses,
  saveOperations,
} from "@/app/actions/operations";
import { formatQuantity } from "@/lib/inspection-constants";
import {
  collectionCountdown,
  COLLECTION_FIELDS,
  fromDateOnly,
  MAX_AMOUNT,
  MAX_REMARKS,
  netWeightKg,
  remainingOperationsSteps,
  toDateOnly,
} from "@/lib/operations-constants";
import { autosaveLabel, useAutosave } from "@/lib/use-autosave";
import Cell from "../Cell";
import TextAreaCell from "../TextAreaCell";
import shared from "../workflow.module.css";
import ExpenseTable from "./ExpenseTable";
import Form6Document from "./Form6Document";
import OperationsPhotos from "./OperationsPhotos";
import styles from "./operations.module.css";

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;
const COUNTDOWN_CLASS = { info: "countdownInfo", warn: "countdownWarn", bad: "countdownBad" };

function lineFromApi(l) {
  return { ...l, actualQuantity: l.actualQuantity === null ? "" : String(l.actualQuantity), remarks: l.remarks };
}

export default function OperationsEditor({ poId, operations, scheduledCollectionAt }) {
  const [acknowledged, setAcknowledged] = useState(operations.acknowledged);
  const [pickupDate, setPickupDate] = useState(toDateOnly(operations.pickupDate));
  const [lines, setLines] = useState(() => operations.lines.map(lineFromApi));
  const [fields, setFields] = useState(() => {
    const init = {};
    for (const f of COLLECTION_FIELDS) {
      init[f.key] = f.type === "date" ? toDateOnly(operations[f.key]) : String(operations[f.key] ?? "");
    }
    return init;
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const countdown = useMemo(() => collectionCountdown(scheduledCollectionAt), [scheduledCollectionAt]);
  const steps = remainingOperationsSteps({
    acknowledged,
    pickupDate,
    lines,
    weighmentEmptyKg: fields.weighmentEmptyKg,
    weighmentLoadedKg: fields.weighmentLoadedKg,
    form6Number: fields.form6Number,
  });
  const netWeight = useMemo(
    () => netWeightKg(fields.weighmentEmptyKg, fields.weighmentLoadedKg),
    [fields.weighmentEmptyKg, fields.weighmentLoadedKg],
  );

  function touched() {
    setMessage(null);
    setConfirming(false);
  }

  function updateLine(id, field, value) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
    touched();
  }

  function setField(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }));
    touched();
  }

  function payload() {
    const p = {};
    if (acknowledged) p.acknowledged = true;
    const pd = fromDateOnly(pickupDate);
    if (pd) p.pickupDate = pd;
    for (const f of COLLECTION_FIELDS) {
      const v = fields[f.key];
      if (f.type === "date") {
        const iso = fromDateOnly(v);
        if (iso) p[f.key] = iso;
      } else if (f.type === "money" || f.type === "weight") {
        if (v.trim() !== "") p[f.key] = Number(v);
      } else if (v !== undefined) {
        p[f.key] = v;
      }
    }
    p.lines = lines.map((l) => ({
      id: l.id,
      actualQuantity: l.actualQuantity.trim() === "" ? null : Number(l.actualQuantity),
      remarks: l.remarks,
    }));
    return p;
  }

  function validate() {
    const found = {};
    lines.forEach((l, i) => {
      if (l.actualQuantity.trim() !== "" && !/^\d+(\.\d{1,3})?$/.test(l.actualQuantity)) {
        found[`lines.${i}.actualQuantity`] = "Enter a number (up to 3 decimals)";
      }
    });
    COLLECTION_FIELDS.forEach((f) => {
      if (f.type === "money" && fields[f.key].trim() !== "" && !AMOUNT_RE.test(fields[f.key])) {
        found[f.key] = "Enter an amount (up to 2 decimals)";
      }
      if (f.type === "weight" && fields[f.key].trim() !== "" && !AMOUNT_RE.test(fields[f.key])) {
        found[f.key] = "Enter a weight in kg (up to 2 decimals)";
      }
    });
    return found;
  }

  const { status: saveStatus, flush } = useAutosave({
    value: JSON.stringify(payload()),
    onSave: async () => {
      const found = validate();
      setErrors(found);
      if (Object.keys(found).length > 0) {
        setMessage({ kind: "error", text: "Fix the highlighted fields and try again." });
        return false;
      }
      const result = await saveOperations(poId, payload());
      if (result?.operations) {
        setErrors({});
        return true;
      }
      if (result?.errors) {
        setErrors(result.errors);
        setMessage({ kind: "error", text: "Fix the highlighted fields and try again." });
      } else {
        setMessage({ kind: "error", text: result?.message ?? "Something went wrong." });
      }
      return false;
    },
  });

  function complete() {
    setConfirming(false);
    startTransition(async () => {
      const saved = await flush();
      if (!saved) return;
      const result = await completeOperations(poId);
      if (result) {
        setMessage({ kind: "error", text: result.message ?? "Something went wrong.", list: result.blockers });
      }
    });
  }

  return (
    <>
      <div className={shared.card}>
        <div className={shared.cardHead}>
          <h2 className={shared.cardTitle}>Inspection Report</h2>
        </div>
        <p className={shared.text}>
          Review the Inspection Report generated in the Pickup stage before recording the collection.
        </p>
        <a className={shared.linkBtn} href={`/purchase-orders/${poId}/pickup/report`} target="_blank" rel="noreferrer">
          Open Inspection Report
        </a>
        <label className={`${shared.ack} ${styles.ack}`}>
          <input
            type="checkbox"
            checked={acknowledged}
            disabled={acknowledged}
            onChange={(e) => {
              setAcknowledged(e.target.checked);
              touched();
            }}
          />
          I acknowledge the Inspection Report
        </label>
        {countdown && (
          <div>
            <span className={styles[COUNTDOWN_CLASS[countdown.tone]]}>{countdown.text}</span>
          </div>
        )}
      </div>

      <div className={shared.card}>
        <div className={shared.cardHead}>
          <h2 className={shared.cardTitle}>Collection Details</h2>
        </div>
        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <label className={shared.label} htmlFor="op-pickup-date">
              Pickup Date <span className={shared.req}>*</span>
            </label>
            <input
              id="op-pickup-date"
              type="date"
              className={shared.cell}
              value={pickupDate}
              onChange={(e) => {
                setPickupDate(e.target.value);
                touched();
              }}
            />
          </div>
          {COLLECTION_FIELDS.map((f) => (
            <div key={f.key} className={styles.field}>
              <label className={shared.label} htmlFor={`op-${f.key}`}>
                {f.label} {f.required && <span className={shared.req}>*</span>}
              </label>
              <input
                id={`op-${f.key}`}
                type={f.type === "date" ? "date" : "text"}
                inputMode={f.type === "money" || f.type === "weight" ? "decimal" : undefined}
                className={`${shared.cell} ${errors[f.key] ? shared.cellInvalid : ""}`}
                value={fields[f.key]}
                onChange={(e) => setField(f.key, e.target.value)}
              />
              {errors[f.key] && <div className={shared.cellError}>{errors[f.key]}</div>}
            </div>
          ))}
          <Form6Document poId={poId} document={operations.form6Document} editable />
        </div>
        {netWeight !== null && (
          <p className={styles.hint}>Net weight (Loaded − Empty): {netWeight} kg</p>
        )}
      </div>

      <div className={shared.card}>
        <div className={shared.cardHead}>
          <h2 className={shared.cardTitle}>Materials</h2>
          <span className={styles.hint}>Actual Quantity differing from Inspected is highlighted.</span>
        </div>
        <div className={shared.scroll}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Material</th>
                <th>UoM</th>
                <th className={shared.right}>Client Qty</th>
                <th className={shared.right}>Inspected Qty</th>
                <th className={shared.right}>Actual Qty</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const actualNum = l.actualQuantity.trim() === "" ? null : Number(l.actualQuantity);
                const differs = actualNum !== null && !Number.isNaN(actualNum) && actualNum !== l.inspectedQuantity;
                return (
                  <tr key={l.id} className={differs ? styles.discrepancy : undefined}>
                    <td className={shared.plain}>{l.materialName}</td>
                    <td className={shared.plain}>{l.uom}</td>
                    <td className={`${shared.plain} ${shared.right}`}>{formatQuantity(l.clientQuantity)}</td>
                    <td className={`${shared.plain} ${shared.right}`}>{formatQuantity(l.inspectedQuantity)}</td>
                    <td>
                      <Cell
                        numeric
                        value={l.actualQuantity}
                        onChange={(e) => updateLine(l.id, "actualQuantity", e.target.value)}
                        error={errors[`lines.${i}.actualQuantity`]}
                        inputMode="decimal"
                        placeholder="Enter qty"
                        aria-label={`Actual quantity, ${l.materialName}`}
                      />
                      {differs && (
                        <div className={styles.discrepancyNote}>
                          {actualNum > l.inspectedQuantity ? "+" : ""}
                          {formatQuantity(actualNum - l.inspectedQuantity)} vs inspected
                        </div>
                      )}
                    </td>
                    <td>
                      <TextAreaCell
                        value={l.remarks}
                        onChange={(e) => updateLine(l.id, "remarks", e.target.value)}
                        maxLength={MAX_REMARKS}
                        placeholder="Add remark"
                        aria-label={`Remarks, ${l.materialName}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {lines.length === 0 && <div className={shared.emptyRows}>No materials were recorded for this PO.</div>}
        </div>
      </div>

      <OperationsPhotos poId={poId} initialPhotos={operations.photos} />

      <ExpenseTable
        title="Collection Expenses"
        editable
        initialLines={operations.collectionExpenses}
        onSave={(lines) => saveCollectionExpenses(poId, lines)}
      />
      <ExpenseTable
        title="Logistics Expenses"
        editable
        initialLines={operations.logisticsExpenses}
        onSave={(lines) => saveLogisticsExpenses(poId, lines)}
      />

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
          <span>Marking Operations complete locks this record and moves the PO to the Factory stage.</span>
          <span className={shared.confirmActions}>
            <button type="button" className={shared.btn} onClick={() => setConfirming(false)}>
              Cancel
            </button>
            <button type="button" className={shared.btnPrimary} onClick={complete} disabled={pending}>
              {pending ? "Working…" : "Confirm & complete"}
            </button>
          </span>
        </div>
      )}

      <div className={shared.actions}>
        <span className={shared.status}>{autosaveLabel(saveStatus)}</span>
        <button type="button" className={shared.btnPrimary} onClick={() => setConfirming(true)} disabled={pending || steps.length > 0}>
          Mark Operations Complete
        </button>
      </div>
      {steps.length > 0 && (
        <div className={shared.remaining}>
          To complete:
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
