"use client";

import { useRef, useState } from "react";
import { removeOperationsPhoto, uploadOperationsPhotos } from "@/app/actions/operations";
import { PHOTO_EXTENSIONS } from "@/lib/inspection-constants";
import { formatBytes, MAX_FILE_BYTES, MAX_FILES } from "@/lib/po-constants";
import shared from "../workflow.module.css";
import styles from "./operations.module.css";

function Thumbs({ poId, photos, onRemove }) {
  if (photos.length === 0) return null;
  return (
    <div className={shared.thumbs}>
      {photos.map((p) => (
        <div key={p.id} className={shared.thumb}>
          <a
            className={shared.thumbBox}
            href={`/purchase-orders/${poId}/operations/photos/${p.id}`}
            target="_blank"
            rel="noreferrer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/purchase-orders/${poId}/operations/photos/${p.id}`} alt={p.name} loading="lazy" />
          </a>
          {onRemove && (
            <button type="button" className={shared.thumbRemove} onClick={() => onRemove(p.id)} aria-label={`Remove ${p.name}`}>
              ×
            </button>
          )}
          <div className={shared.thumbName} title={p.name}>
            {p.name}
          </div>
          <div className={styles.gps}>
            {p.gps ? (
              <a
                href={`https://www.google.com/maps?q=${p.gps.lat},${p.gps.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                {p.gps.lat.toFixed(5)}, {p.gps.lng.toFixed(5)}
              </a>
            ) : (
              "No location data"
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Read-only strip of geotagged photos (completed records, BD/Admin view). */
export function GeoPhotoGallery({ poId, photos }) {
  return <Thumbs poId={poId} photos={photos} />;
}

export default function OperationsPhotos({ poId, initialPhotos }) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [problems, setProblems] = useState([]);
  const input = useRef(null);

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
    const result = await uploadOperationsPhotos(poId, body);
    setBusy(false);
    if (result.photos) setPhotos(result.photos);
    else setProblems((p) => [...p, result.message ?? "The photos could not be uploaded."]);
  }

  async function remove(photoId) {
    setBusy(true);
    const result = await removeOperationsPhoto(poId, photoId);
    setBusy(false);
    if (result.photos) setPhotos(result.photos);
    else setProblems([result.message ?? "The photo could not be removed."]);
  }

  return (
    <div className={shared.card}>
      <div className={shared.cardHead}>
        <h2 className={shared.cardTitle}>
          Geotagged Photos <span className={shared.optional}>(optional)</span>
        </h2>
      </div>
      <p className={shared.text}>
        GPS location is read automatically from a photo&rsquo;s own metadata when the phone or camera recorded it.
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
        className={`${shared.drop} ${dragging ? shared.dragging : ""}`}
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
        <div className={shared.dropTitle}>{busy ? "Working…" : "Drag photos here, or click to browse"}</div>
        <div className={shared.dropHint}>JPG, PNG up to {formatBytes(MAX_FILE_BYTES)} each</div>
      </div>

      {problems.map((p) => (
        <div key={p} className={shared.fileProblem} role="alert">
          {p}
        </div>
      ))}
      <Thumbs poId={poId} photos={photos} onRemove={busy ? null : remove} />
    </div>
  );
}
