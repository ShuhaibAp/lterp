"use client";

import { useState, useTransition } from "react";
import { completeFactory, saveFactory } from "@/app/actions/factory";
import { formatQuantity } from "@/lib/inspection-constants";
import { MAX_REMARKS } from "@/lib/operations-constants";
import { autosaveLabel, useAutosave } from "@/lib/use-autosave";
import Cell from "../Cell";
import TextAreaCell from "../TextAreaCell";
import shared from "../workflow.module.css";
import ops from "../operations/operations.module.css";
import FactoryPhotos from "./FactoryPhotos";
import SlipUpload from "./SlipUpload";
import TeardownLog from "./TeardownLog";

const WEIGHT_RE = /^\d+(\.\d{1,2})?$/;
const QTY_RE = /^\d+(\.\d{1,3})?$/;

const text = (n) => (n === null || n === undefined ? "" : String(n));
const lineFromApi = (l) => ({ ...l, processedQuantity: text(l.processedQuantity) });

function netWeight(empty, loaded) {
  if (!WEIGHT_RE.test(empty) || !WEIGHT_RE.test(loaded)) return null;
  return Math.round((Number(loaded) - Number(empty)) * 100) / 100;
}

/** What still stands between this record and marking Factory complete (mirrors the server's check). */
function remainingSteps({ empty, loaded, slipEmpty, slipLoad, lines }) {
  const out = [];
  if (!slipEmpty) out.push("Upload the scanned Weighment Slip – Empty.");
  if (!slipLoad) out.push("Upload the scanned Weighment Slip – Load.");
  if (empty.trim() === "") out.push("Enter the Empty Weight (kg).");
  if (loaded.trim() === "") out.push("Enter the Loaded Weight (kg).");
  if (lines.some((l) => l.processedQuantity.trim() === "")) out.push("Enter the processed quantity for every material.");
  return out;
}

export default function FactoryEditor({ poId, factory }) {
  const [empty, setEmpty] = useState(text(factory.weighmentEmptyKg));
  const [loaded, setLoaded] = useState(text(factory.weighmentLoadedKg));
  const [output, setOutput] = useState(text(factory.outputWeightKg));
  const [residue, setResidue] = useState(text(factory.residueWeightKg));
  const [lines, setLines] = useState(() => factory.lines.map(lineFromApi));
  const [slipEmpty, setSlipEmpty] = useState(factory.weighmentSlipEmpty);
  const [slipLoad, setSlipLoad] = useState(factory.weighmentSlipLoad);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const steps = remainingSteps({ empty, loaded, slipEmpty, slipLoad, lines });
  const net = netWeight(empty, loaded);
  const opsWeights = factory.operationsWeights;

  function touched() {
    setMessage(null);
    setConfirming(false);
  }

  function updateLine(id, field, value) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
    touched();
  }

  function payload() {
    const p = {};
    if (empty.trim() !== "") p.weighmentEmptyKg = Number(empty);
    if (loaded.trim() !== "") p.weighmentLoadedKg = Number(loaded);
    if (output.trim() !== "") p.outputWeightKg = Number(output);
    if (residue.trim() !== "") p.residueWeightKg = Number(residue);
    p.lines = lines.map((l) => ({
      id: l.id,
      processedQuantity: l.processedQuantity.trim() === "" ? null : Number(l.processedQuantity),
      remarks: l.remarks,
    }));
    return p;
  }

  function validate() {
    const found = {};
    if (empty.trim() !== "" && !WEIGHT_RE.test(empty)) found.weighmentEmptyKg = "Enter a weight in kg (up to 2 decimals)";
    if (loaded.trim() !== "" && !WEIGHT_RE.test(loaded)) found.weighmentLoadedKg = "Enter a weight in kg (up to 2 decimals)";
    if (output.trim() !== "" && !WEIGHT_RE.test(output)) found.outputWeightKg = "Enter a weight in kg (up to 2 decimals)";
    if (residue.trim() !== "" && !WEIGHT_RE.test(residue)) found.residueWeightKg = "Enter a weight in kg (up to 2 decimals)";
    lines.forEach((l, i) => {
      if (l.processedQuantity.trim() !== "" && !QTY_RE.test(l.processedQuantity)) {
        found[`lines.${i}.processedQuantity`] = "Enter a number (up to 3 decimals)";
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
      const result = await saveFactory(poId, payload());
      if (result?.factory) {
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
      const result = await completeFactory(poId);
      if (result) setMessage({ kind: "error", text: result.message ?? "Something went wrong.", list: result.blockers });
    });
  }

  return (
    <>
      <div className={shared.card}>
        <div className={shared.cardHead}>
          <h2 className={shared.cardTitle}>Weighment</h2>
        </div>
        <p className={shared.text}>
          Weigh the vehicle on arrival and enter the figures from the two slips. Operations&rsquo; weights at pickup are
          shown for comparison.
        </p>
        <div className={ops.fieldGrid}>
          <div className={ops.field}>
            <label className={shared.label} htmlFor="f-empty">
              Empty Weight (kg) <span className={shared.req}>*</span>
            </label>
            <input
              id="f-empty"
              inputMode="decimal"
              className={`${shared.cell} ${errors.weighmentEmptyKg ? shared.cellInvalid : ""}`}
              value={empty}
              onChange={(e) => {
                setEmpty(e.target.value);
                touched();
              }}
            />
            {errors.weighmentEmptyKg && <div className={shared.cellError}>{errors.weighmentEmptyKg}</div>}
          </div>
          <div className={ops.field}>
            <label className={shared.label} htmlFor="f-loaded">
              Loaded Weight (kg) <span className={shared.req}>*</span>
            </label>
            <input
              id="f-loaded"
              inputMode="decimal"
              className={`${shared.cell} ${errors.weighmentLoadedKg ? shared.cellInvalid : ""}`}
              value={loaded}
              onChange={(e) => {
                setLoaded(e.target.value);
                touched();
              }}
            />
            {errors.weighmentLoadedKg && <div className={shared.cellError}>{errors.weighmentLoadedKg}</div>}
          </div>
          <SlipUpload poId={poId} kind="empty" label="Weighment Slip – Empty" file={slipEmpty} editable onChange={(f) => setSlipEmpty(f.weighmentSlipEmpty)} />
          <SlipUpload poId={poId} kind="load" label="Weighment Slip – Load" file={slipLoad} editable onChange={(f) => setSlipLoad(f.weighmentSlipLoad)} />
        </div>
        {net !== null && <p className={ops.hint}>Net weight at Factory (Loaded − Empty): {net} kg</p>}
        {opsWeights && opsWeights.netWeightKg !== null && (
          <p className={ops.hint}>
            Operations recorded at pickup: Empty {opsWeights.weighmentEmptyKg} kg, Loaded {opsWeights.weighmentLoadedKg} kg,
            Net {opsWeights.netWeightKg} kg.
          </p>
        )}
      </div>

      <div className={shared.card}>
        <div className={shared.cardHead}>
          <h2 className={shared.cardTitle}>
            Output and residue <span className={shared.optional}>(optional)</span>
          </h2>
        </div>
        <p className={shared.text}>
          After processing, weigh the recycled output and the residue that could not be recycled. The Mass Flow Report uses
          them to account for the inbound weight.
        </p>
        <div className={ops.fieldGrid}>
          <div className={ops.field}>
            <label className={shared.label} htmlFor="f-output">
              Recycled output (kg)
            </label>
            <input
              id="f-output"
              inputMode="decimal"
              className={`${shared.cell} ${errors.outputWeightKg ? shared.cellInvalid : ""}`}
              value={output}
              onChange={(e) => {
                setOutput(e.target.value);
                touched();
              }}
            />
            {errors.outputWeightKg && <div className={shared.cellError}>{errors.outputWeightKg}</div>}
          </div>
          <div className={ops.field}>
            <label className={shared.label} htmlFor="f-residue">
              Residue (kg)
            </label>
            <input
              id="f-residue"
              inputMode="decimal"
              className={`${shared.cell} ${errors.residueWeightKg ? shared.cellInvalid : ""}`}
              value={residue}
              onChange={(e) => {
                setResidue(e.target.value);
                touched();
              }}
            />
            {errors.residueWeightKg && <div className={shared.cellError}>{errors.residueWeightKg}</div>}
          </div>
        </div>
      </div>

      <div className={shared.card}>
        <div className={shared.cardHead}>
          <h2 className={shared.cardTitle}>Materials</h2>
          <span className={ops.hint}>Processed Quantity differing from Actual is highlighted.</span>
        </div>
        <div className={shared.scroll}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>Material</th>
                <th>UoM</th>
                <th className={shared.right}>Inspected Qty</th>
                <th className={shared.right}>Actual Qty</th>
                <th className={shared.right}>Processed Qty</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const processed = l.processedQuantity.trim() === "" ? null : Number(l.processedQuantity);
                const reference = l.actualQuantity ?? l.inspectedQuantity;
                const differs = processed !== null && !Number.isNaN(processed) && processed !== reference;
                return (
                  <tr key={l.id} className={differs ? ops.discrepancy : undefined}>
                    <td className={shared.plain}>{l.materialName}</td>
                    <td className={shared.plain}>{l.uom}</td>
                    <td className={`${shared.plain} ${shared.right}`}>{formatQuantity(l.inspectedQuantity)}</td>
                    <td className={`${shared.plain} ${shared.right}`}>
                      {l.actualQuantity === null ? "—" : formatQuantity(l.actualQuantity)}
                    </td>
                    <td>
                      <Cell
                        numeric
                        value={l.processedQuantity}
                        onChange={(e) => updateLine(l.id, "processedQuantity", e.target.value)}
                        error={errors[`lines.${i}.processedQuantity`]}
                        inputMode="decimal"
                        placeholder="Enter qty"
                        aria-label={`Processed quantity, ${l.materialName}`}
                      />
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

      <FactoryPhotos poId={poId} initialPhotos={factory.photos} />

      {factory.teardownLog && <TeardownLog poId={poId} entries={factory.teardownLog} canWrite={false} />}

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
          <span>Marking Factory complete locks this record, runs the weighment cross-check and creates the AOR.</span>
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
          Mark Factory Complete
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
