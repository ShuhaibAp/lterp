"use client";

import { useRef, useState } from "react";
import { removeForm6Document, uploadForm6Document } from "@/app/actions/operations";
import { ALLOWED_EXTENSIONS, formatBytes, MAX_FILE_BYTES } from "@/lib/po-constants";
import shared from "../workflow.module.css";
import styles from "./operations.module.css";

/**
 * Optional scanned copy (PDF or a camera photo) of the Form 6 manifest, kept separate from the
 * required Form 6 *Number* field. `capture="environment"` opens the phone's camera directly when
 * the browser supports it; it's just a hint, so it degrades to the normal file/photo picker.
 */
export default function Form6Document({ poId, document: doc, editable }) {
  const [current, setCurrent] = useState(doc);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const input = useRef(null);

  async function upload(list) {
    const file = list?.[0];
    if (!file) return;
    const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setProblem(`"${file.name}" — only PDF, JPG or PNG files are allowed.`);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setProblem(`"${file.name}" is larger than ${formatBytes(MAX_FILE_BYTES)}.`);
      return;
    }
    setProblem(null);
    const body = new FormData();
    body.append("form6", file);
    setBusy(true);
    const result = await uploadForm6Document(poId, body);
    setBusy(false);
    if (result.operations) setCurrent(result.operations.form6Document);
    else setProblem(result.message ?? "The file could not be uploaded.");
  }

  async function remove() {
    setBusy(true);
    const result = await removeForm6Document(poId);
    setBusy(false);
    if (result.operations) setCurrent(result.operations.form6Document);
    else setProblem(result.message ?? "The file could not be removed.");
  }

  return (
    <div className={styles.field}>
      <span className={shared.label}>
        Form 6 Document <span className={shared.optional}>(optional)</span>
      </span>
      {current ? (
        <div className={styles.form6Row}>
          <a
            className={shared.linkBtn}
            href={`/purchase-orders/${poId}/operations/form6-document`}
            target="_blank"
            rel="noreferrer"
          >
            {current.name} ({formatBytes(current.size)})
          </a>
          {editable && (
            <button type="button" className={shared.btn} onClick={remove} disabled={busy}>
              {busy ? "Working…" : "Remove"}
            </button>
          )}
        </div>
      ) : editable ? (
        <>
          <input
            ref={input}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            capture="environment"
            hidden
            onChange={(e) => {
              upload(e.target.files);
              e.target.value = "";
            }}
          />
          <button type="button" className={shared.btn} onClick={() => input.current?.click()} disabled={busy}>
            {busy ? "Uploading…" : "Add scanned copy or photo"}
          </button>
        </>
      ) : (
        <span className={shared.text}>Not uploaded</span>
      )}
      {problem && (
        <div className={shared.fileProblem} role="alert">
          {problem}
        </div>
      )}
    </div>
  );
}
