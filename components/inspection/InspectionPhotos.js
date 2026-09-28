"use client";

import { useEffect, useRef, useState } from "react";
import { removeInspectionPhoto, saveInspectionPhotoTags, uploadInspectionPhotos } from "@/app/actions/inspection";
import { MAX_PHOTO_LABEL, PHOTO_EXTENSIONS } from "@/lib/inspection-constants";
import { formatBytes, MAX_FILE_BYTES, MAX_FILES } from "@/lib/po-constants";
import { autosaveLabel, useAutosave } from "@/lib/use-autosave";
import styles from "../workflow.module.css";

const src = (poId, id) => `/purchase-orders/${poId}/inspection/photos/${id}`;
const OTHER = "__other__";

/** Read-only strip of photos (completed inspections); the tag says what each one shows. */
export function PhotoGallery({ poId, photos }) {
  if (photos.length === 0) return null;
  return (
    <div className={styles.thumbs}>
      {photos.map((p) => (
        <div key={p.id} className={styles.thumb}>
          <a className={styles.thumbBox} href={src(poId, p.id)} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src(poId, p.id)} alt={p.tag || p.name} loading="lazy" />
          </a>
          {p.tag && <div className={styles.thumbTag}>{p.tag}</div>}
          <div className={styles.thumbName} title={p.name}>
            {p.name}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Local editing state for one photo's tag: none, a listed material, or a typed name. */
function fromApi(p) {
  if (p.lineId) return { ...p, mode: "line", lineName: p.tag };
  return { ...p, mode: p.label ? "custom" : "none", lineName: "" };
}

/** A tag whose material row was deleted keeps its last name as a typed name instead of pointing nowhere. */
function effective(p, materialIds) {
  if (p.mode === "line" && !materialIds.has(p.lineId)) {
    return { ...p, mode: "custom", lineId: null, label: p.lineName };
  }
  return p;
}

function tagPayload(p) {
  if (p.mode === "line") return { id: p.id, lineId: p.lineId };
  if (p.mode === "custom") return { id: p.id, lineId: null, label: p.label.trim() };
  return { id: p.id, lineId: null, label: "" };
}

/**
 * `materials` are the saved rows of the inspection list (`{id, name}`) - the dropdown of what a
 * photo can be tagged as. `flushRef` lets the editor wait for a pending tag save before it
 * completes (and so locks) the inspection.
 */
export default function InspectionPhotos({ poId, initialPhotos, materials, flushRef }) {
  const [photos, setPhotos] = useState(() => initialPhotos.map(fromApi));
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [problems, setProblems] = useState([]);
  const input = useRef(null);
  const materialIds = new Set(materials.map((m) => m.id));

  const { status, flush } = useAutosave({
    value: JSON.stringify(photos.map((p) => tagPayload(effective(p, materialIds)))),
    onSave: async () => {
      const result = await saveInspectionPhotoTags(poId, photos.map((p) => tagPayload(effective(p, materialIds))));
      if (result.photos) {
        setProblems([]);
        return true;
      }
      setProblems([result.message ?? "The photo names could not be saved."]);
      return false;
    },
  });

  useEffect(() => {
    if (flushRef) flushRef.current = flush;
  });

  function merge(serverPhotos) {
    setPhotos((prev) => serverPhotos.map((p) => prev.find((x) => x.id === p.id) ?? fromApi(p)));
  }

  function update(id, patch) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function choose(p, value) {
    if (value === "") return update(p.id, { mode: "none", lineId: null, lineName: "" });
    if (value === OTHER) return update(p.id, { mode: "custom", lineId: null, lineName: "" });
    const material = materials.find((m) => m.id === value);
    update(p.id, { mode: "line", lineId: value, lineName: material?.name ?? "" });
  }

  async function upload(list) {
    const files = Array.from(list);
    const found = [];
    const accepted = [];
    for (const file of files) {
      const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
      if (!PHOTO_EXTENSIONS.includes(ext)) found.push(`"${file.name}" — only JPG and PNG photos are allowed.`);
      else if (file.size === 0) found.push(`"${file.name}" is empty.`);
      else if (file.size > MAX_FILE_BYTES) found.push(`"${file.name}" is larger than ${formatBytes(MAX_FILE_BYTES)}.`);
      else accepted.push(file);
    }
    if (accepted.length > MAX_FILES) {
      found.push(`You can add up to ${MAX_FILES} photos at a time.`);
      accepted.length = MAX_FILES;
    }
    setProblems(found);
    if (accepted.length === 0) return;

    const body = new FormData();
    accepted.forEach((f) => body.append("photos", f));
    setBusy(true);
    await flush();
    const result = await uploadInspectionPhotos(poId, body);
    setBusy(false);
    if (result.photos) merge(result.photos);
    else setProblems((p) => [...p, result.message ?? "The photos could not be uploaded."]);
  }

  async function remove(photoId) {
    setBusy(true);
    await flush();
    const result = await removeInspectionPhoto(poId, photoId);
    setBusy(false);
    if (result.photos) merge(result.photos);
    else setProblems([result.message ?? "The photo could not be removed."]);
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>
          Inspection Photos <span className={styles.optional}>(optional)</span>
        </h2>
      </div>
      <p className={styles.text}>
        Name what each photo shows: pick one of the materials above, or choose “Other” and type your own name for a bundled or
        general shot.
      </p>

      <input
        ref={input}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        hidden
        onChange={(e) => {
          upload(e.target.files);
          e.target.value = "";
        }}
      />
      <div
        className={`${styles.drop} ${dragging ? styles.dragging : ""}`}
        role="button"
        tabIndex={0}
        aria-busy={busy}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            input.current?.click();
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
          upload(e.dataTransfer.files);
        }}
      >
        <div className={styles.dropTitle}>{busy ? "Working…" : "Drag photos here, or click to browse"}</div>
        <div className={styles.dropHint}>JPG, PNG up to {formatBytes(MAX_FILE_BYTES)} each</div>
      </div>

      {problems.map((p) => (
        <div key={p} className={styles.fileProblem} role="alert">
          {p}
        </div>
      ))}

      {photos.length > 0 && (
        <div className={styles.tagGrid}>
          {photos.map((raw, i) => {
            const p = effective(raw, materialIds);
            const selected = p.mode === "line" ? p.lineId : p.mode === "custom" ? OTHER : "";
            return (
              <div key={p.id} className={styles.tagCard}>
                <a className={styles.tagImage} href={src(poId, p.id)} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src(poId, p.id)} alt={p.name} loading="lazy" />
                </a>
                {!busy && (
                  <button type="button" className={styles.thumbRemove} onClick={() => remove(p.id)} aria-label={`Remove ${p.name}`}>
                    ×
                  </button>
                )}
                <select
                  className={styles.cell}
                  value={selected}
                  onChange={(e) => choose(p, e.target.value)}
                  aria-label={`What photo ${i + 1} shows`}
                >
                  <option value="">Not named</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                  <option value={OTHER}>Other (type a name)…</option>
                </select>
                {p.mode === "custom" && (
                  <input
                    className={styles.cell}
                    value={p.label}
                    maxLength={MAX_PHOTO_LABEL}
                    onChange={(e) => update(p.id, { label: e.target.value })}
                    placeholder="e.g. Bundled cables, front view"
                    aria-label={`Name for photo ${i + 1}`}
                  />
                )}
                <div className={styles.thumbName} title={p.name}>
                  {p.name}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {photos.length > 0 && <div className={styles.status}>{autosaveLabel(status)}</div>}
    </div>
  );
}
