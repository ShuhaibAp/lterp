"use client";

import { useRef, useState } from "react";
import { removeFactorySlip, uploadFactorySlip } from "@/app/actions/factory";
import { ALLOWED_EXTENSIONS, formatBytes, MAX_FILE_BYTES } from "@/lib/po-constants";
import shared from "../workflow.module.css";
import styles from "../operations/operations.module.css";

/**
 * One scanned weighment slip (PDF or a camera photo). Both slips are mandatory before Factory can
 * be marked complete (BR-07.01); a new upload replaces the previous one.
 */
export default function SlipUpload({ poId, kind, label, file, editable, onChange }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const input = useRef(null);

  async function upload(list) {
    const picked = list?.[0];
    if (!picked) return;
    const ext = picked.name.includes(".") ? picked.name.split(".").pop().toLowerCase() : "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setProblem(`"${picked.name}" — only PDF, JPG or PNG files are allowed.`);
      return;
    }
    if (picked.size > MAX_FILE_BYTES) {
      setProblem(`"${picked.name}" is larger than ${formatBytes(MAX_FILE_BYTES)}.`);
      return;
    }
    setProblem(null);
    const body = new FormData();
    body.append("slip", picked);
    setBusy(true);
    try {
      const result = await uploadFactorySlip(poId, kind, body);
      if (result?.factory) onChange?.(result.factory);
      else setProblem(result?.message ?? "The file could not be uploaded.");
    } catch {
      setProblem("The file could not be uploaded. If it is a large photo, try a smaller file (under 4 MB) and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const result = await removeFactorySlip(poId, kind);
      if (result?.factory) onChange?.(result.factory);
      else setProblem(result?.message ?? "The file could not be removed.");
    } catch {
      setProblem("The file could not be removed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.field}>
      <span className={shared.label}>
        {label} {editable && <span className={shared.req}>*</span>}
      </span>
      {file ? (
        <div className={styles.form6Row}>
          <a className={shared.linkBtn} href={`/purchase-orders/${poId}/factory/slips/${kind}`} target="_blank" rel="noreferrer">
            {file.name} ({formatBytes(file.size)})
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
            hidden
            onChange={(e) => {
              upload(e.target.files);
              e.target.value = "";
            }}
          />
          <button type="button" className={shared.btn} onClick={() => input.current?.click()} disabled={busy}>
            {busy ? "Uploading…" : "Upload scan or photo"}
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
