"use client";

import { useRef, useState, useTransition } from "react";
import { generateFinalReports, removeReportSignature, uploadReportSignature } from "@/app/actions/closeout";
import { formatBytes } from "@/lib/po-constants";
import shared from "../workflow.module.css";

const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

/** Admin: add the authorised signature for the Certificate of Destruction, then generate the reports. */
export default function ReportsPanel({ poId, state }) {
  const [signature, setSignature] = useState(state.signature);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const input = useRef(null);

  async function upload(file) {
    if (!file) return;
    const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
    if (!["jpg", "jpeg", "png"].includes(ext)) return setProblem("Use a JPG or PNG image.");
    if (file.size > MAX_SIGNATURE_BYTES) return setProblem(`The image is larger than ${formatBytes(MAX_SIGNATURE_BYTES)}.`);
    setProblem("");
    const body = new FormData();
    body.append("signature", file);
    setBusy(true);
    const result = await uploadReportSignature(poId, body);
    setBusy(false);
    if (result.signature !== undefined) setSignature(result.signature);
    else setProblem(result.message ?? "The image could not be uploaded.");
  }

  async function remove() {
    setBusy(true);
    const result = await removeReportSignature(poId);
    setBusy(false);
    if (result.signature !== undefined) setSignature(result.signature);
    else setProblem(result.message ?? "The image could not be removed.");
  }

  function generate() {
    setConfirming(false);
    startTransition(async () => {
      const result = await generateFinalReports(poId);
      if (result) setMessage({ text: result.message ?? "Something went wrong.", list: result.blockers });
    });
  }

  return (
    <>
      <div className={shared.card}>
        <h2 className={shared.cardTitle}>Authorised signature</h2>
        <p className={shared.text}>This signature is printed on the Certificate of Destruction. It is optional.</p>
        {signature ? (
          <div>
            <span className={shared.text}>
              {signature.name} ({formatBytes(signature.size)}){" "}
            </span>
            <button type="button" className={shared.btn} onClick={remove} disabled={busy}>
              {busy ? "Working…" : "Remove"}
            </button>
          </div>
        ) : (
          <>
            <input
              ref={input}
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              hidden
              onChange={(e) => {
                upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button type="button" className={shared.btn} onClick={() => input.current?.click()} disabled={busy}>
              {busy ? "Uploading…" : "Upload signature image"}
            </button>
          </>
        )}
        {problem && (
          <div className={shared.fileProblem} role="alert">
            {problem}
          </div>
        )}
      </div>

      <div className={shared.card}>
        <h2 className={shared.cardTitle}>Generate the final reports</h2>
        <p className={shared.text}>
          Creates the Certificate of Destruction, Sustainability Report, Mass Flow Report and the Full Set. This is done
          by hand, once everything is complete.
        </p>
        {state.blockers.length > 0 && (
          <div className={shared.remaining}>
            Not ready yet:
            <ul>
              {state.blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        )}
        {message && (
          <div className={shared.error} role="alert">
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
            <span>Generating the reports moves the PO to Final Reports and cannot be undone.</span>
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
          <button
            type="button"
            className={shared.btnPrimary}
            onClick={() => setConfirming(true)}
            disabled={pending || !state.canGenerate}
          >
            Generate final reports
          </button>
        </div>
      </div>
    </>
  );
}
