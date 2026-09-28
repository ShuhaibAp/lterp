"use client";

import { useRef, useState } from "react";
import { removeSignature, uploadSignature } from "@/app/actions/quotation";
import { PHOTO_EXTENSIONS } from "@/lib/inspection-constants";
import { formatBytes } from "@/lib/po-constants";
import { MAX_SIGNATURE_BYTES } from "@/lib/quotation-math";
import shared from "../workflow.module.css";
import styles from "./quotation.module.css";

// The canvas is drawn at 2x so the signature stays crisp when printed on the PDF.
const CANVAS_WIDTH = 880;
const CANVAS_HEIGHT = 300;

export default function SignaturePad({ poId, initialSignature }) {
  const [signature, setSignature] = useState(initialSignature);
  const [mode, setMode] = useState("draw");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [hasInk, setHasInk] = useState(false);
  const canvas = useRef(null);
  const last = useRef(null);
  const fileInput = useRef(null);

  function point(e) {
    const rect = canvas.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * CANVAS_WIDTH) / rect.width,
      y: ((e.clientY - rect.top) * CANVAS_HEIGHT) / rect.height,
    };
  }

  function stroke(from, to) {
    const ctx = canvas.current.getContext("2d");
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1f2020";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  function onDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    last.current = point(e);
    stroke(last.current, last.current);
    setHasInk(true);
  }

  function onMove(e) {
    if (!last.current) return;
    const next = point(e);
    stroke(last.current, next);
    last.current = next;
  }

  function onUp() {
    last.current = null;
  }

  function clear() {
    canvas.current.getContext("2d").clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    setHasInk(false);
  }

  async function send(file) {
    setProblem("");
    const body = new FormData();
    body.append("signature", file, file.name);
    setBusy(true);
    const result = await uploadSignature(poId, body);
    setBusy(false);
    if (result.message) return setProblem(result.message);
    setSignature(result.signature);
    clear();
  }

  function useDrawing() {
    canvas.current.toBlob((blob) => {
      if (blob) send(new File([blob], "signature.png", { type: "image/png" }));
    }, "image/png");
  }

  function pickFile(file) {
    const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
    if (!PHOTO_EXTENSIONS.includes(ext)) return setProblem("Only JPG and PNG images can be used as a signature.");
    if (file.size === 0) return setProblem("That file is empty.");
    if (file.size > MAX_SIGNATURE_BYTES) return setProblem(`The image is larger than ${formatBytes(MAX_SIGNATURE_BYTES)}.`);
    send(file);
  }

  async function remove() {
    setProblem("");
    setBusy(true);
    const result = await removeSignature(poId);
    setBusy(false);
    if (result.message) return setProblem(result.message);
    setSignature(null);
  }

  return (
    <div className={shared.card}>
      <div className={shared.cardHead}>
        <h2 className={shared.cardTitle}>
          Authorised Signature <span className={shared.optional}>(optional)</span>
        </h2>
        <span className={shared.tbc}>DSC STANDARD TBC — DRAWN / IMAGE FOR NOW</span>
      </div>

      <div className={styles.sigTabs} role="tablist" aria-label="Signature method">
        {[
          ["draw", "Draw"],
          ["upload", "Upload"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            className={`${styles.sigTab} ${mode === value ? styles.sigTabActive : ""}`}
            onClick={() => setMode(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "draw" ? (
        <>
          <canvas
            ref={canvas}
            className={styles.pad}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            aria-label="Signature drawing area. Use the Upload tab if you cannot draw."
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          />
          <div className={styles.padHint}>Sign inside the box with your mouse, finger or pen.</div>
          <div className={styles.padActions}>
            <button type="button" className={shared.btn} onClick={clear} disabled={!hasInk || busy}>
              Clear
            </button>
            <button type="button" className={shared.btnPrimary} onClick={useDrawing} disabled={!hasInk || busy}>
              {busy ? "Saving…" : "Use this signature"}
            </button>
          </div>
        </>
      ) : (
        <>
          <input
            ref={fileInput}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            hidden
            onChange={(e) => {
              if (e.target.files[0]) pickFile(e.target.files[0]);
              e.target.value = "";
            }}
          />
          <button type="button" className={shared.btn} onClick={() => fileInput.current?.click()} disabled={busy}>
            {busy ? "Uploading…" : "Choose signature image"}
          </button>
          <div className={styles.padHint}>JPG or PNG, up to {formatBytes(MAX_SIGNATURE_BYTES)}.</div>
        </>
      )}

      {problem && (
        <div className={shared.fileProblem} role="alert">
          {problem}
        </div>
      )}

      {signature && (
        <div className={styles.sigCurrent}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.sigImage}
            src={`/purchase-orders/${poId}/quotation/signature?v=${encodeURIComponent(signature.uploadedAt)}`}
            alt="Current signature"
          />
          <div>
            <div className={styles.sigName}>{signature.name}</div>
            <button type="button" className={shared.btn} onClick={remove} disabled={busy}>
              Remove signature
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
