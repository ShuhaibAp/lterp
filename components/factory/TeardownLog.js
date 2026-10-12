"use client";

import { useRef, useState } from "react";
import { saveTeardownLog } from "@/app/actions/factory";
import { formatQuantity } from "@/lib/inspection-constants";
import { formatDay } from "@/lib/po-constants";
import { autosaveLabel, useAutosave } from "@/lib/use-autosave";
import Cell from "../Cell";
import shared from "../workflow.module.css";

const QTY_RE = /^\d+(\.\d{1,3})?$/;
const MAX_TEXT = 200;

const toDateOnly = (iso) => (iso ? iso.slice(0, 10) : "");

function rowFromEntry(e) {
  return {
    key: e.id,
    componentName: e.componentName,
    quantity: String(e.quantity),
    condition: e.condition,
    date: toDateOnly(e.date),
    technician: e.technician,
    remarks: e.remarks,
  };
}

const blankRow = (key) => ({ key, componentName: "", quantity: "", condition: "", date: "", technician: "", remarks: "" });

function validate(rows) {
  const found = {};
  rows.forEach((r, i) => {
    if (!r.componentName.trim()) found[`entries.${i}.componentName`] = "Required";
    if (!QTY_RE.test(r.quantity)) found[`entries.${i}.quantity`] = "Enter a number";
  });
  return found;
}

const toPayload = (rows) =>
  rows.map((r) => ({
    componentName: r.componentName.trim(),
    quantity: Number(r.quantity),
    condition: r.condition.trim(),
    ...(r.date ? { date: r.date } : {}),
    technician: r.technician.trim(),
    remarks: r.remarks.trim(),
  }));

/**
 * The Teardown Log (FR-07.05..07). Admin is the only role that can write it (BR-07.02); Factory
 * and Operations see it read-only. `canWrite` is decided by the server, not by this component.
 */
export default function TeardownLog({ poId, entries, canWrite }) {
  const [rows, setRows] = useState(() => entries.map(rowFromEntry));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const nextKey = useRef(0);

  const { status: saveStatus } = useAutosave({
    value: JSON.stringify(rows.map(({ key: _key, ...r }) => r)),
    onSave: async () => {
      const found = validate(rows);
      setErrors(found);
      if (Object.keys(found).length > 0) {
        setMessage("Fix the highlighted fields and try again.");
        return false;
      }
      const result = await saveTeardownLog(poId, toPayload(rows));
      if (result?.teardownLog) {
        setMessage(null);
        return true;
      }
      setMessage(result?.message ?? "Something went wrong.");
      return false;
    },
  });

  function update(key, field, value) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
    setMessage(null);
  }

  return (
    <div className={shared.card}>
      <div className={shared.cardHead}>
        <h2 className={shared.cardTitle}>Teardown Log</h2>
      </div>
      {!canWrite && <p className={shared.text}>Only Admin can add or change entries here.</p>}

      <div className={shared.scroll}>
        <table className={shared.table}>
          <thead>
            <tr>
              <th>Component</th>
              <th className={shared.right}>Quantity</th>
              <th>Condition</th>
              <th>Date</th>
              <th>Technician</th>
              <th>Remarks</th>
              {canWrite && <th aria-label="Remove row" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key}>
                {canWrite ? (
                  <>
                    <td>
                      <Cell
                        value={r.componentName}
                        onChange={(e) => update(r.key, "componentName", e.target.value)}
                        error={errors[`entries.${i}.componentName`]}
                        maxLength={MAX_TEXT}
                        aria-label={`Component, row ${i + 1}`}
                      />
                    </td>
                    <td>
                      <Cell
                        numeric
                        value={r.quantity}
                        onChange={(e) => update(r.key, "quantity", e.target.value)}
                        error={errors[`entries.${i}.quantity`]}
                        inputMode="decimal"
                        aria-label={`Quantity, row ${i + 1}`}
                      />
                    </td>
                    <td>
                      <Cell
                        value={r.condition}
                        onChange={(e) => update(r.key, "condition", e.target.value)}
                        maxLength={MAX_TEXT}
                        aria-label={`Condition, row ${i + 1}`}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        className={shared.cell}
                        value={r.date}
                        onChange={(e) => update(r.key, "date", e.target.value)}
                        aria-label={`Date, row ${i + 1}`}
                      />
                    </td>
                    <td>
                      <Cell
                        value={r.technician}
                        onChange={(e) => update(r.key, "technician", e.target.value)}
                        maxLength={MAX_TEXT}
                        aria-label={`Technician, row ${i + 1}`}
                      />
                    </td>
                    <td>
                      <Cell
                        value={r.remarks}
                        onChange={(e) => update(r.key, "remarks", e.target.value)}
                        maxLength={1000}
                        aria-label={`Remarks, row ${i + 1}`}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className={shared.iconBtn}
                        onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                        aria-label={`Remove row ${i + 1}`}
                      >
                        ×
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className={shared.plain}>{r.componentName}</td>
                    <td className={`${shared.plain} ${shared.right}`}>{formatQuantity(Number(r.quantity))}</td>
                    <td className={shared.plain}>{r.condition || "—"}</td>
                    <td className={shared.plain}>{r.date ? formatDay(r.date) : "—"}</td>
                    <td className={shared.plain}>{r.technician || "—"}</td>
                    <td className={shared.plain}>{r.remarks || "—"}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className={shared.emptyRows}>No teardown entries yet.</div>}
      </div>

      {canWrite && (
        <>
          <button type="button" className={shared.linkBtn} onClick={() => setRows((prev) => [...prev, blankRow(`new-${nextKey.current++}`)])}>
            + Add entry
          </button>
          {message && (
            <div className={shared.error} role="alert">
              {message}
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
