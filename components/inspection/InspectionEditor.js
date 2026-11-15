"use client";

import { useRef, useState, useTransition } from "react";
import { completeInspection, parseInspectionList, saveInspection } from "@/app/actions/inspection";
import { LIST_EXTENSIONS, MAX_LIST_BYTES, MAX_REMARKS } from "@/lib/inspection-constants";
import UomSelect from "@/components/UomSelect";
import { blankRow, remainingSteps, rowFromLine, toPayload, validateRows } from "@/lib/inspection-rows";
import { formatBytes } from "@/lib/po-constants";
import { autosaveLabel, useAutosave } from "@/lib/use-autosave";
import Cell from "../Cell";
import ColumnMappingModal from "../ColumnMappingModal";
import LockIcon from "../LockIcon";
import TextAreaCell from "../TextAreaCell";
import InspectionPhotos from "./InspectionPhotos";
import styles from "../workflow.module.css";

const MAPPING_FIELDS = [
  { key: "materialName", label: "Material Name", required: true },
  { key: "uom", label: "UoM", required: false },
  { key: "clientQuantity", label: "Client Quantity", required: false },
];

export default function InspectionEditor({ poId, initial, uoms: initialUoms }) {
  const [rows, setRows] = useState(() => initial.lines.map(rowFromLine));
  const [acknowledged, setAcknowledged] = useState(initial.acknowledged);
  const [expense, setExpense] = useState(initial.expenseTotal === null ? "" : String(initial.expenseTotal));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [uoms, setUoms] = useState(initialUoms);
  const [confirming, setConfirming] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importNote, setImportNote] = useState(null);
  const [listProblem, setListProblem] = useState("");
  const [dragging, setDragging] = useState(false);
  const [mapping, setMapping] = useState(null); // { file, preview } while the mapping modal is open
  const [mappingPending, setMappingPending] = useState(false);
  const [mappingError, setMappingError] = useState(null);
  const [pending, startTransition] = useTransition();
  const nextKey = useRef(0);
  const fileInput = useRef(null);
  const photosFlush = useRef(null);

  const steps = remainingSteps(rows, acknowledged, expense);
  const latestPayload = useRef(null);
  latestPayload.current = toPayload(rows, acknowledged, expense);

  const { status: saveStatus, flush } = useAutosave({
    value: JSON.stringify(toPayload(rows, acknowledged, expense)),
    onSave: async () => {
      const found = validateRows(rows, acknowledged, expense, uoms);
      setErrors(found);
      if (Object.keys(found).length > 0) {
        setMessage({ kind: "error", text: "Fix the highlighted fields and try again." });
        return false;
      }
      const sentPayload = toPayload(rows, acknowledged, expense);
      const sentKey = JSON.stringify(sentPayload);
      const sentKeys = rows.map((r) => r.key);
      const result = await saveInspection(poId, sentPayload);
      if (result?.inspection) {
        if (JSON.stringify(latestPayload.current) === sentKey) {
          // Nothing changed while saving - safe to sync with the server's copy.
          setRows(result.inspection.lines.map(rowFromLine));
          setAcknowledged(result.inspection.acknowledged);
          setExpense(result.inspection.expenseTotal === null ? "" : String(result.inspection.expenseTotal));
        } else {
          // The user kept typing during the save: don't overwrite their input with the stale
          // response. Only attach server ids to newly-saved rows so they aren't duplicated.
          const idByKey = new Map(sentKeys.map((k, i) => [k, result.inspection.lines[i]?.id]));
          setRows((cur) => cur.map((r) => (r.id ? r : { ...r, id: idByKey.get(r.key) ?? null })));
        }
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

  function touched() {
    setMessage(null);
    setConfirming(false);
  }

  function clearError(key) {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  }

  function updateRow(rowKey, field, value) {
    const index = rows.findIndex((r) => r.key === rowKey);
    setRows((prev) => prev.map((r) => (r.key === rowKey ? { ...r, [field]: value } : r)));
    clearError(`lines.${index}.${field}`);
    touched();
  }

  function addRow() {
    setRows((prev) => [...prev, blankRow(`new-${nextKey.current++}`)]);
    touched();
  }

  function removeRow(rowKey) {
    setRows((prev) => prev.filter((r) => r.key !== rowKey));
    setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith("lines"))));
    touched();
  }

  // Step 1: read the file and open the column-mapping modal with a suggested mapping - never
  // import silently, so an unrecognised, reordered or header-less file works the same way.
  async function importList(file) {
    setListProblem("");
    setImportNote(null);
    const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
    if (!LIST_EXTENSIONS.includes(ext)) return setListProblem("Only .xlsx or .csv files can be uploaded.");
    if (file.size === 0) return setListProblem("That file is empty.");
    if (file.size > MAX_LIST_BYTES) return setListProblem(`The file is larger than ${formatBytes(MAX_LIST_BYTES)}.`);

    setImporting(true);
    const result = await parseInspectionList(poId, file, null);
    setImporting(false);
    if (result.mode !== "preview") return setListProblem(result.message ?? "The file could not be read.");
    setMappingError(null);
    setMapping({ file, preview: result });
  }

  // Step 2: the user confirmed (or fixed) the mapping - import using exactly that mapping.
  function confirmMapping({ headerRow, columns }) {
    setMappingError(null);
    setMappingPending(true);
    startTransition(async () => {
      const result = await parseInspectionList(poId, mapping.file, {
        headerRow,
        materialNameCol: columns.materialName,
        uomCol: columns.uom,
        clientQuantityCol: columns.clientQuantity,
      });
      setMappingPending(false);
      if (result.mode !== "rows") {
        setMappingError(result.message ?? "The file could not be read.");
        return;
      }
      setRows((prev) => [
        ...prev,
        ...result.rows.map((r) =>
          blankRow(`new-${nextKey.current++}`, {
            materialName: r.materialName,
            uom: r.uom,
            clientQuantity: String(r.clientQuantity),
          }),
        ),
      ]);
      setImportNote({ file: mapping.file.name, added: result.rows.length, skipped: result.skipped });
      setMapping(null);
      touched();
    });
  }

  function proceed() {
    const found = validateRows(rows, acknowledged, expense, uoms);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setMessage({ kind: "error", text: "Fix the highlighted fields and try again." });
      return;
    }
    setConfirming(false);
    startTransition(async () => {
      await flush();
      await photosFlush.current?.();
      const result = await completeInspection(poId, toPayload(rows, acknowledged, expense));
      if (result?.errors) {
        setErrors(result.errors);
        setMessage({ kind: "error", text: "Fix the highlighted fields and try again." });
      } else if (result) {
        setMessage({ kind: "error", text: result.message ?? "Something went wrong.", list: result.blockers });
      }
    });
  }

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Inspection List</h2>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx,.csv"
          hidden
          onChange={(e) => {
            if (e.target.files[0]) importList(e.target.files[0]);
            e.target.value = "";
          }}
        />
        <div
          className={`${styles.drop} ${dragging ? styles.dragging : ""}`}
          role="button"
          tabIndex={0}
          aria-busy={importing}
          onClick={() => fileInput.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInput.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files[0]) importList(e.dataTransfer.files[0]);
          }}
        >
          <div className={styles.dropTitle}>
            {importing ? "Reading file…" : "Drag an Excel/CSV file here, or click to browse"}
          </div>
          <div className={styles.dropHint}>XLSX, CSV up to {formatBytes(MAX_LIST_BYTES)}</div>
        </div>
        <button type="button" className={styles.linkBtn} onClick={addRow}>
          or build manually
        </button>
        {listProblem && (
          <div className={styles.fileProblem} role="alert">
            {listProblem}
          </div>
        )}
        {importNote && (
          <div className={`${importNote.skipped.length > 0 ? styles.warn : styles.notice} ${styles.importNote}`}>
            Added {importNote.added} {importNote.added === 1 ? "row" : "rows"} from {importNote.file}.
            {importNote.skipped.length > 0 && (
              <>
                {" "}
                {importNote.skipped.length} {importNote.skipped.length === 1 ? "row was" : "rows were"} skipped:
                <ul className={styles.list}>
                  {importNote.skipped.slice(0, 8).map((s) => (
                    <li key={s.row}>
                      Row {s.row}: {s.reason}
                    </li>
                  ))}
                  {importNote.skipped.length > 8 && <li>…and {importNote.skipped.length - 8} more</li>}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      <div className={styles.card}>
        <label className={styles.ack}>
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => {
              setAcknowledged(e.target.checked);
              touched();
            }}
          />
          I acknowledge that the inspection process is complete
        </label>

        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Material Name</th>
                <th>UoM</th>
                <th className={styles.right}>Client Quantity</th>
                <th className={styles.right}>Inspected Quantity</th>
                <th>Remarks</th>
                <th aria-label="Remove row" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.key}>
                  <td>
                    <Cell
                      value={row.materialName}
                      onChange={(e) => updateRow(row.key, "materialName", e.target.value)}
                      error={errors[`lines.${i}.materialName`]}
                      aria-label={`Material name, row ${i + 1}`}
                      placeholder="e.g. Copper Cable"
                    />
                  </td>
                  <td>
                    <UomSelect
                      className={`${styles.cell} ${errors[`lines.${i}.uom`] ? styles.cellInvalid : ""}`}
                      value={row.uom}
                      uoms={uoms}
                      onChange={(u) => updateRow(row.key, "uom", u)}
                      onUomsChange={setUoms}
                      label={`Unit of measure, row ${i + 1}`}
                      invalid={!!errors[`lines.${i}.uom`]}
                    />
                    {errors[`lines.${i}.uom`] && (
                      <div className={styles.cellError} role="alert">
                        {errors[`lines.${i}.uom`]}
                      </div>
                    )}
                  </td>
                  <td>
                    <Cell
                      numeric
                      value={row.clientQuantity}
                      onChange={(e) => updateRow(row.key, "clientQuantity", e.target.value)}
                      error={errors[`lines.${i}.clientQuantity`]}
                      inputMode="decimal"
                      aria-label={`Client quantity, row ${i + 1}`}
                    />
                  </td>
                  <td>
                    {acknowledged ? (
                      <Cell
                        numeric
                        value={row.inspectedQuantity}
                        onChange={(e) => updateRow(row.key, "inspectedQuantity", e.target.value)}
                        error={errors[`lines.${i}.inspectedQuantity`]}
                        inputMode="decimal"
                        placeholder="Enter qty"
                        aria-label={`Inspected quantity, row ${i + 1}`}
                      />
                    ) : (
                      <div className={styles.locked} title="Locked until the inspection acknowledgement above is ticked.">
                        <span>{row.inspectedQuantity || "—"}</span>
                        <LockIcon size={11} />
                      </div>
                    )}
                  </td>
                  <td>
                    <TextAreaCell
                      value={row.remarks}
                      onChange={(e) => updateRow(row.key, "remarks", e.target.value)}
                      error={errors[`lines.${i}.remarks`]}
                      maxLength={MAX_REMARKS}
                      aria-label={`Remarks, row ${i + 1}`}
                      placeholder="Add remark"
                    />
                  </td>
                  <td>
                    <button type="button" className={styles.iconBtn} onClick={() => removeRow(row.key)} aria-label={`Remove row ${i + 1}`}>
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className={styles.emptyRows}>No rows yet. Upload a file above or add a line item.</div>}
        </div>
        {errors.lines && <div className={styles.cellError}>{errors.lines}</div>}
        <button type="button" className={styles.linkBtn} onClick={addRow}>
          + Add line item
        </button>
      </div>

      <InspectionPhotos
        poId={poId}
        initialPhotos={initial.photos}
        materials={rows.filter((r) => r.id && r.materialName.trim()).map((r) => ({ id: r.id, name: r.materialName.trim() }))}
        flushRef={photosFlush}
      />

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Expense Capture</h2>
          <span className={styles.tbc}>STRUCTURE TBC — SINGLE TOTAL FOR NOW</span>
        </div>
        <div className={styles.expense}>
          <label className={styles.label} htmlFor="inspection-expense">
            Total Inspection Expense <span className={styles.req}>*</span>
          </label>
          <div className={styles.moneyWrap}>
            <span className={styles.rupee} aria-hidden="true">
              ₹
            </span>
            <input
              id="inspection-expense"
              className={`${styles.cell} ${styles.money} ${errors.expenseTotal ? styles.cellInvalid : ""}`}
              value={expense}
              onChange={(e) => {
                setExpense(e.target.value);
                clearError("expenseTotal");
                touched();
              }}
              inputMode="decimal"
              placeholder="e.g. 4500"
              aria-invalid={!!errors.expenseTotal}
            />
          </div>
          {errors.expenseTotal && (
            <div className={styles.cellError} role="alert">
              {errors.expenseTotal}
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className={message.kind === "error" ? styles.error : styles.notice} role={message.kind === "error" ? "alert" : "status"}>
          {message.text}
          {message.list && (
            <ul className={styles.list}>
              {message.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {confirming && (
        <div className={styles.confirm} role="alert">
          <span>Proceeding locks the inspection data and moves this PO to the Quotation stage. Only remarks can be changed afterwards.</span>
          <span className={styles.confirmActions}>
            <button type="button" className={styles.btn} onClick={() => setConfirming(false)}>
              Cancel
            </button>
            <button type="button" className={styles.btnPrimary} onClick={proceed} disabled={pending}>
              {pending ? "Working…" : "Confirm & proceed"}
            </button>
          </span>
        </div>
      )}

      <div className={styles.actions}>
        <span className={styles.status}>{autosaveLabel(saveStatus)}</span>
        <button type="button" className={styles.btnPrimary} onClick={() => setConfirming(true)} disabled={pending || steps.length > 0}>
          Proceed to Quotation
        </button>
      </div>
      {steps.length > 0 && (
        <div className={styles.remaining}>
          To proceed:
          <ul>
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {mapping && (
        <ColumnMappingModal
          fileName={mapping.file.name}
          preview={mapping.preview}
          fields={MAPPING_FIELDS}
          pending={mappingPending}
          error={mappingError}
          onCancel={() => setMapping(null)}
          onConfirm={confirmMapping}
        />
      )}
    </>
  );
}
