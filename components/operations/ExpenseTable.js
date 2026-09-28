"use client";

import { useRef, useState } from "react";
import { formatMoney } from "@/lib/inspection-constants";
import { MAX_AMOUNT, MAX_TEXT } from "@/lib/operations-constants";
import { autosaveLabel, useAutosave } from "@/lib/use-autosave";
import Cell from "../Cell";
import shared from "../workflow.module.css";
import styles from "./operations.module.css";

const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

function rowFromLine(line) {
  return { key: line.id, id: line.id, description: line.description, amount: String(line.amount) };
}

function blankRow(key) {
  return { key, id: null, description: "", amount: "" };
}

function validateRows(rows) {
  const found = {};
  rows.forEach((r, i) => {
    if (!r.description.trim()) found[`lines.${i}.description`] = "Description is required";
    if (!AMOUNT_RE.test(r.amount)) found[`lines.${i}.amount`] = "Enter an amount (up to 2 decimals)";
    else if (Number(r.amount) > MAX_AMOUNT) found[`lines.${i}.amount`] = "Amount is too large";
  });
  return found;
}

/**
 * BR-06.02: Collection Expenses and Logistics Expenses are two independent tables that must
 * never merge. This one component renders either - the caller decides which by what it passes
 * for `title`/`initialLines`/`onSave`, so there is exactly one place this table is built.
 */
export default function ExpenseTable({ title, editable, initialLines, onSave }) {
  const [rows, setRows] = useState(() => initialLines.map(rowFromLine));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const nextKey = useRef(0);

  const total = rows.reduce((sum, r) => {
    const n = Number(r.amount);
    return AMOUNT_RE.test(r.amount) ? sum + n : sum;
  }, 0);

  const { status: saveStatus } = useAutosave({
    value: JSON.stringify(rows.map((r) => ({ description: r.description.trim(), amount: r.amount }))),
    onSave: async () => {
      const found = validateRows(rows);
      setErrors(found);
      if (Object.keys(found).length > 0) {
        setMessage({ kind: "error", text: "Fix the highlighted fields and try again." });
        return false;
      }
      const payload = rows.map((r) => ({ description: r.description.trim(), amount: Number(r.amount) }));
      const result = await onSave(payload);
      if (result?.operations) {
        setErrors({});
        setMessage(null);
        return true;
      }
      setMessage({ kind: "error", text: result?.message ?? "Something went wrong." });
      return false;
    },
  });

  function touched() {
    setMessage(null);
  }

  function updateRow(key, field, value) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
    setErrors((prev) => {
      const idx = rows.findIndex((r) => r.key === key);
      const { [`lines.${idx}.${field}`]: _removed, ...rest } = prev;
      return rest;
    });
    touched();
  }

  function addRow() {
    setRows((prev) => [...prev, blankRow(`new-${nextKey.current++}`)]);
    touched();
  }

  function removeRow(key) {
    setRows((prev) => prev.filter((r) => r.key !== key));
    touched();
  }

  return (
    <div className={shared.card}>
      <div className={shared.cardHead}>
        <h2 className={shared.cardTitle}>{title}</h2>
      </div>

      <div className={shared.scroll}>
        <table className={shared.table}>
          <thead>
            <tr>
              <th>Description</th>
              <th className={shared.right}>Amount (₹)</th>
              {editable && <th aria-label="Remove row" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.key}>
                <td>
                  {editable ? (
                    <Cell
                      value={row.description}
                      onChange={(e) => updateRow(row.key, "description", e.target.value)}
                      error={errors[`lines.${i}.description`]}
                      maxLength={MAX_TEXT}
                      placeholder="e.g. Vehicle hire"
                      aria-label={`Description, row ${i + 1}`}
                    />
                  ) : (
                    <span className={shared.plain}>{row.description}</span>
                  )}
                </td>
                <td className={editable ? undefined : shared.right}>
                  {editable ? (
                    <Cell
                      numeric
                      value={row.amount}
                      onChange={(e) => updateRow(row.key, "amount", e.target.value)}
                      error={errors[`lines.${i}.amount`]}
                      inputMode="decimal"
                      placeholder="0.00"
                      aria-label={`Amount, row ${i + 1}`}
                    />
                  ) : (
                    <span className={shared.plain}>{formatMoney(Number(row.amount) || 0)}</span>
                  )}
                </td>
                {editable && (
                  <td>
                    <button type="button" className={shared.iconBtn} onClick={() => removeRow(row.key)} aria-label={`Remove row ${i + 1}`}>
                      ×
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className={shared.emptyRows}>No expenses recorded yet.</div>}
      </div>

      <div className={styles.expenseTotal}>
        <span>Total</span>
        <span>{formatMoney(total)}</span>
      </div>

      {editable && (
        <>
          <button type="button" className={shared.linkBtn} onClick={addRow}>
            + Add expense
          </button>

          {message && (
            <div className={message.kind === "error" ? shared.error : shared.notice} role={message.kind === "error" ? "alert" : "status"}>
              {message.text}
            </div>
          )}

          <div className={`${shared.actions} ${shared.actionsTop}`}>
            <span className={shared.status}>{autosaveLabel(saveStatus)}</span>
          </div>
        </>
      )}
    </div>
  );
}
