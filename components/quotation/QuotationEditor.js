"use client";

import { useRef, useState, useTransition } from "react";
import { approveQuotation, readTermsFile, returnQuotation, saveQuotation, submitQuotation } from "@/app/actions/quotation";
import UomSelect from "@/components/UomSelect";
import { formatMoney, formatQuantity } from "@/lib/inspection-constants";
import { formatBytes, formatDate } from "@/lib/po-constants";
import {
  asText,
  blankRow,
  MAX_NOTE,
  MAX_TERMS,
  MAX_TERMS_FILE_BYTES,
  TERMS_FILE_EXTENSIONS,
  quotationTotals,
  remainingSteps,
  rowFromLine,
  rowTotal,
  toPayload,
  validateQuotation,
} from "@/lib/quotation-math";
import { autosaveLabel, useAutosave } from "@/lib/use-autosave";
import Cell from "../Cell";
import shared from "../workflow.module.css";
import SignaturePad from "./SignaturePad";
import styles from "./quotation.module.css";

/**
 * BD edits a draft or returned quotation and submits it. With `reviewing`, Admin edits a
 * submitted one and approves or returns it; unsaved edits are saved before either decision.
 */
export default function QuotationEditor({ poId, quotation, uoms: initialUoms, reviewing = false }) {
  const manual = quotation.manualLines;
  const [uoms, setUoms] = useState(initialUoms);
  const [rows, setRows] = useState(() => quotation.lines.map(rowFromLine));
  const [terms, setTerms] = useState(quotation.terms);
  const [gst, setGst] = useState(asText(quotation.gstPercent));
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [pending, startTransition] = useTransition();
  const nextKey = useRef(0);
  const termsInput = useRef(null);
  const [termsReading, setTermsReading] = useState(false);
  const [termsNote, setTermsNote] = useState(null);

  const lineTotals = rows.map(rowTotal);
  const totals = quotationTotals(lineTotals, gst);
  const steps = remainingSteps(rows);

  // Exclude server-assigned `id` from the autosave snapshot so attaching ids to newly created
  // manual rows doesn't trigger a second save, and never overwrite typed input on save response.
  const draftKey = JSON.stringify({
    lines: rows.map((r) => ({
      materialName: r.materialName,
      uom: r.uom,
      quantity: r.quantity,
      unitPrice: r.unitPrice,
    })),
    terms,
    gst,
  });

  const { status: saveStatus, flush } = useAutosave({
    value: draftKey,
    onSave: async () => {
      const found = validateQuotation(rows, manual, terms, gst, uoms);
      setErrors(found);
      if (Object.keys(found).length > 0) {
        setMessage({ kind: "error", text: "Fix the highlighted fields and try again." });
        return false;
      }
      const sentKeys = rows.map((r) => r.key);
      const result = await saveQuotation(poId, toPayload(rows, manual, terms, gst));
      if (result?.quotation) {
        // Never overwrite the user's typed prices/GST/terms or change row.key (which would remount
        // inputs and flicker/steal focus). Only attach server ids onto newly created rows.
        const idByKey = new Map(sentKeys.map((k, i) => [k, result.quotation.lines[i]?.id ?? null]));
        setRows((cur) => {
          let changed = false;
          const next = cur.map((r) => {
            if (r.id) return r;
            const assigned = idByKey.get(r.key);
            if (!assigned) return r;
            changed = true;
            return { ...r, id: assigned };
          });
          return changed ? next : cur;
        });
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

  function touched() {
    setMessage(null);
    setConfirming(null);
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

  /** Reads the chosen file on the server and adds its text to the Terms box (below anything already typed). */
  async function importTerms(file) {
    setTermsNote(null);
    const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
    if (!TERMS_FILE_EXTENSIONS.includes(ext)) {
      return setTermsNote({ kind: "error", text: "Upload a PDF, Word (.docx) or text (.txt) file." });
    }
    if (file.size === 0) return setTermsNote({ kind: "error", text: "That file is empty." });
    if (file.size > MAX_TERMS_FILE_BYTES) {
      return setTermsNote({ kind: "error", text: `The file is larger than ${formatBytes(MAX_TERMS_FILE_BYTES)}.` });
    }

    const body = new FormData();
    body.append("file", file);
    setTermsReading(true);
    const result = await readTermsFile(poId, body);
    setTermsReading(false);
    if (result.text === undefined) {
      return setTermsNote({ kind: "error", text: result.message ?? "The file could not be read." });
    }

    const combined = terms.trim() ? `${terms.trimEnd()}\n\n${result.text}` : result.text;
    const cut = combined.length > MAX_TERMS;
    setTerms(combined.slice(0, MAX_TERMS));
    clearError("terms");
    touched();
    setTermsNote({
      kind: result.truncated || cut ? "warn" : "success",
      text:
        result.truncated || cut
          ? `Added text from ${result.fileName}, but only the first ${MAX_TERMS} characters fit. Check the end of the terms.`
          : `Added the text from ${result.fileName}. You can edit it below.`,
    });
  }

  function showActionError(result) {
    if (result?.errors) {
      setErrors(result.errors);
      setMessage({ kind: "error", text: "Fix the highlighted fields and try again." });
    } else if (result) {
      setMessage({ kind: "error", text: result.message ?? "Something went wrong.", list: result.blockers });
    }
  }

  /** Validates, flushes any pending autosave (so nothing races it), then calls `action(poId, ...args)`. */
  function decide(action, ...args) {
    const found = validateQuotation(rows, manual, terms, gst, uoms);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setMessage({ kind: "error", text: "Fix the highlighted fields and try again." });
      return;
    }
    setConfirming(null);
    startTransition(async () => {
      const saved = await flush();
      if (!saved) return;
      const result = await action(poId, ...args);
      if (result) showActionError(result);
    });
  }

  const readyLabel = reviewing ? "To approve:" : "To submit:";

  return (
    <>
      {!reviewing && quotation.status === "Returned" && (
        <div className={shared.warn} role="status">
          Returned for revision by {quotation.reviewedBy} on {formatDate(quotation.reviewedAt)}.
          {quotation.returnNote && (
            <>
              {" "}
              Note: <strong>{quotation.returnNote}</strong>
            </>
          )}
        </div>
      )}
      {reviewing && (
        <div className={shared.info} role="status">
          You can correct prices, items, GST and terms before approving. Changes are saved with your name.
        </div>
      )}

      <div className={shared.card}>
        <div className={shared.cardHead}>
          <h2 className={shared.cardTitle}>Quotation Items</h2>
          <span className={styles.meta}>
            {manual ? "Add the items and price them." : "From the completed inspection. Enter a unit price for each item."}
          </span>
        </div>

        <div className={shared.scroll}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Material</th>
                <th>UoM</th>
                <th className={shared.right}>Quantity</th>
                <th className={shared.right}>Unit Price (₹)</th>
                <th className={shared.right}>Line Total</th>
                {manual && <th aria-label="Remove row" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.key}>
                  <td className={shared.plain}>{i + 1}</td>
                  <td>
                    {manual ? (
                      <Cell
                        value={row.materialName}
                        onChange={(e) => updateRow(row.key, "materialName", e.target.value)}
                        error={errors[`lines.${i}.materialName`]}
                        aria-label={`Material, row ${i + 1}`}
                        placeholder="e.g. Mixed e-waste"
                      />
                    ) : (
                      <span className={shared.plain}>{row.materialName}</span>
                    )}
                  </td>
                  <td>
                    {manual ? (
                      <>
                        <UomSelect
                          className={`${shared.cell} ${errors[`lines.${i}.uom`] ? shared.cellInvalid : ""}`}
                          value={row.uom}
                          uoms={uoms}
                          onChange={(u) => updateRow(row.key, "uom", u)}
                          onUomsChange={setUoms}
                          label={`Unit of measure, row ${i + 1}`}
                          invalid={!!errors[`lines.${i}.uom`]}
                        />
                        {errors[`lines.${i}.uom`] && (
                          <div className={shared.cellError} role="alert">
                            {errors[`lines.${i}.uom`]}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className={shared.plain}>{row.uom}</span>
                    )}
                  </td>
                  <td className={manual ? undefined : shared.right}>
                    {manual ? (
                      <Cell
                        numeric
                        value={row.quantity}
                        onChange={(e) => updateRow(row.key, "quantity", e.target.value)}
                        error={errors[`lines.${i}.quantity`]}
                        inputMode="decimal"
                        aria-label={`Quantity, row ${i + 1}`}
                      />
                    ) : (
                      <span className={shared.plain}>{formatQuantity(Number(row.quantity))}</span>
                    )}
                  </td>
                  <td>
                    <Cell
                      numeric
                      value={row.unitPrice}
                      onChange={(e) => updateRow(row.key, "unitPrice", e.target.value)}
                      error={errors[`lines.${i}.unitPrice`]}
                      inputMode="decimal"
                      placeholder="0.00"
                      aria-label={`Unit price, row ${i + 1}`}
                    />
                  </td>
                  <td className={styles.amount}>{lineTotals[i] === null ? "—" : formatMoney(lineTotals[i])}</td>
                  {manual && (
                    <td>
                      <button type="button" className={shared.iconBtn} onClick={() => removeRow(row.key)} aria-label={`Remove row ${i + 1}`}>
                        ×
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={styles.subRow}>
                <td colSpan={5} className={shared.right}>
                  Subtotal
                </td>
                <td className={styles.amount}>{formatMoney(totals.subtotal)}</td>
                {manual && <td />}
              </tr>
              <tr className={styles.subRow}>
                <td colSpan={5}>
                  <label className={styles.gstField}>
                    GST <span className={shared.optional}>(optional)</span>
                    <input
                      className={`${shared.cell} ${shared.num} ${styles.gstInput} ${errors.gstPercent ? shared.cellInvalid : ""}`}
                      value={gst}
                      onChange={(e) => {
                        setGst(e.target.value);
                        clearError("gstPercent");
                        touched();
                      }}
                      inputMode="decimal"
                      placeholder="0"
                      aria-label="GST percentage"
                      aria-invalid={!!errors.gstPercent}
                    />
                    %
                  </label>
                  {errors.gstPercent && (
                    <div className={`${shared.cellError} ${shared.right}`} role="alert">
                      {errors.gstPercent}
                    </div>
                  )}
                </td>
                <td className={styles.amount}>{totals.gstPercent === null ? "—" : formatMoney(totals.gst)}</td>
                {manual && <td />}
              </tr>
              <tr className={styles.tfoot}>
                <td colSpan={5} className={shared.right}>
                  Grand Total
                </td>
                <td className={`${styles.amount} ${styles.grand}`}>{formatMoney(totals.grandTotal)}</td>
                {manual && <td />}
              </tr>
            </tfoot>
          </table>
          {rows.length === 0 && <div className={shared.emptyRows}>No items yet. Add a line item to start the quotation.</div>}
        </div>
        {errors.lines && <div className={shared.cellError}>{errors.lines}</div>}
        {manual && (
          <button type="button" className={shared.linkBtn} onClick={addRow}>
            + Add line item
          </button>
        )}
      </div>

      <div className={shared.card}>
        <div className={shared.cardHead}>
          <h2 className={shared.cardTitle}>
            Additional Terms &amp; Conditions <span className={shared.optional}>(optional)</span>
          </h2>
        </div>
        <input
          ref={termsInput}
          type="file"
          accept=".pdf,.docx,.txt"
          hidden
          onChange={(e) => {
            if (e.target.files[0]) importTerms(e.target.files[0]);
            e.target.value = "";
          }}
        />
        <div className={styles.termsUpload}>
          <button type="button" className={shared.btn} onClick={() => termsInput.current?.click()} disabled={termsReading}>
            {termsReading ? "Reading file…" : "Upload a file"}
          </button>
          <span className={styles.meta}>PDF, Word (.docx) or text up to {formatBytes(MAX_TERMS_FILE_BYTES)} — its text is added below.</span>
        </div>
        {termsNote && (
          <div
            className={termsNote.kind === "error" ? shared.fileProblem : termsNote.kind === "warn" ? shared.warn : shared.notice}
            role={termsNote.kind === "error" ? "alert" : "status"}
          >
            {termsNote.text}
          </div>
        )}
        <textarea
          className={`${shared.cell} ${styles.textarea} ${errors.terms ? shared.cellInvalid : ""}`}
          value={terms}
          maxLength={MAX_TERMS}
          onChange={(e) => {
            setTerms(e.target.value);
            clearError("terms");
            touched();
          }}
          placeholder="e.g. Payment within 15 days of collection. Rates valid for 15 days."
          aria-label="Additional terms and conditions"
        />
        {errors.terms && <div className={shared.cellError}>{errors.terms}</div>}
      </div>

      <SignaturePad poId={poId} initialSignature={quotation.signature} />

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

      {confirming === "submit" && (
        <div className={shared.confirm} role="alert">
          <span>Submitting sends this quotation to Admin for approval. You cannot edit it while it is under review.</span>
          <span className={shared.confirmActions}>
            <button type="button" className={shared.btn} onClick={() => setConfirming(null)}>
              Cancel
            </button>
            <button type="button" className={shared.btnPrimary} onClick={() => decide(submitQuotation)} disabled={pending}>
              {pending ? "Working…" : "Confirm & submit"}
            </button>
          </span>
        </div>
      )}

      {confirming === "approve" && (
        <div className={shared.confirm} role="alert">
          <span>The quotation is approved and the PDF download unlocks.</span>
          <span className={shared.confirmActions}>
            <button type="button" className={shared.btn} onClick={() => setConfirming(null)}>
              Cancel
            </button>
            <button type="button" className={shared.btnPrimary} onClick={() => decide(approveQuotation)} disabled={pending}>
              {pending ? "Working…" : "Confirm & approve"}
            </button>
          </span>
        </div>
      )}

      {confirming === "return" && (
        <div className={shared.card}>
          <label className={shared.label} htmlFor="return-note">
            Note for BD <span className={shared.optional}>(optional)</span>
          </label>
          <textarea
            id="return-note"
            className={`${shared.cell} ${styles.noteBox}`}
            value={note}
            maxLength={MAX_NOTE}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What needs to change?"
          />
          <div className={styles.reviewRow}>
            <button
              type="button"
              className={shared.btnPrimary}
              onClick={() => decide(returnQuotation, note)}
              disabled={pending}
            >
              {pending ? "Working…" : "Return to BD"}
            </button>
            <button type="button" className={shared.btn} onClick={() => setConfirming(null)} disabled={pending}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className={shared.actions}>
        <span className={shared.status}>{autosaveLabel(saveStatus)}</span>
        {reviewing ? (
          <>
            <button type="button" className={shared.btn} onClick={() => setConfirming("return")} disabled={pending}>
              Return for Revision
            </button>
            <button
              type="button"
              className={shared.btnPrimary}
              onClick={() => setConfirming("approve")}
              disabled={pending || steps.length > 0}
            >
              Approve
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={shared.btnPrimary}
              onClick={() => setConfirming("submit")}
              disabled={pending || steps.length > 0}
            >
              Submit for Approval
            </button>
          </>
        )}
      </div>
      {steps.length > 0 && (
        <div className={shared.remaining}>
          {readyLabel}
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
