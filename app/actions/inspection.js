"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { readFailure, UNREACHABLE } from "@/lib/api-errors";
import { requireRole } from "@/lib/dal";
import { getSessionToken } from "@/lib/session";

const base = (poId) => `/purchase-orders/${encodeURIComponent(poId)}/inspection`;
const json = { headers: { "Content-Type": "application/json" } };

async function call(path, init) {
  const token = await getSessionToken();
  try {
    return await apiFetch(path, { token, ...init });
  } catch {
    return null;
  }
}

function onlyFiles(formData, field) {
  const body = new FormData();
  for (const file of formData.getAll(field)) {
    if (file instanceof File && file.size > 0) body.append(field, file, file.name);
  }
  return body;
}

export async function startInspection(poId, _prev, formData) {
  await requireRole("BD Team");
  const res = await call(base(poId), { method: "POST", ...json, body: JSON.stringify({ type: formData.get("type") }) });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  redirect(`/purchase-orders/${poId}/inspection`);
}

/**
 * Two-step column mapping (see components/ColumnMappingModal.js): called with `mapping: null`
 * it returns a file preview + a suggested mapping, never guessing silently. Called again with
 * the user's confirmed `{headerRow, materialNameCol, uomCol, clientQuantityCol}` it returns
 * the actual rows. Nothing is saved on the server either way.
 */
export async function parseInspectionList(poId, file, mapping) {
  await requireRole("BD Team");
  if (!(file instanceof File) || file.size === 0) return { message: "Choose a file to upload." };

  const body = new FormData();
  body.append("file", file, file.name);
  if (mapping) {
    body.append("confirmed", "1");
    body.append("headerRow", String(mapping.headerRow));
    body.append("materialNameCol", String(mapping.materialNameCol));
    body.append("uomCol", String(mapping.uomCol));
    body.append("clientQuantityCol", String(mapping.clientQuantityCol));
  }

  const res = await call(`${base(poId)}/parse`, { method: "POST", body });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res, "The file is larger than 10 MB.");
  return res.json();
}

export async function saveInspection(poId, payload) {
  await requireRole("BD Team");
  const res = await call(base(poId), { method: "PUT", ...json, body: JSON.stringify(payload) });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  const { inspection } = await res.json();
  return { inspection };
}

/** Saves the current table, then completes the inspection (which moves the PO to Quotation). */
export async function completeInspection(poId, payload) {
  await requireRole("BD Team");
  const saved = await call(base(poId), { method: "PUT", ...json, body: JSON.stringify(payload) });
  if (!saved) return UNREACHABLE;
  if (!saved.ok) return readFailure(saved);

  const res = await call(`${base(poId)}/complete`, { method: "POST" });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  redirect(`/purchase-orders/${poId}/inspection?completed=1`);
}

export async function uploadInspectionPhotos(poId, formData) {
  await requireRole("BD Team");
  const res = await call(`${base(poId)}/photos`, { method: "POST", body: onlyFiles(formData, "photos") });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res, "A photo is too large. Each photo can be up to 25 MB.");
  const { inspection } = await res.json();
  return { photos: inspection.photos };
}

/** Names what each photo shows: `[{id, lineId}]` for a listed material or `[{id, lineId: null, label}]`. */
export async function saveInspectionPhotoTags(poId, tags) {
  await requireRole("BD Team");
  const res = await call(`${base(poId)}/photos`, { method: "PATCH", ...json, body: JSON.stringify({ photos: tags }) });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  const { inspection } = await res.json();
  return { photos: inspection.photos };
}

export async function removeInspectionPhoto(poId, photoId) {
  await requireRole("BD Team");
  const res = await call(`${base(poId)}/photos/${encodeURIComponent(photoId)}`, { method: "DELETE" });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  const { inspection } = await res.json();
  return { photos: inspection.photos };
}

export async function saveInspectionRemarks(poId, payload) {
  await requireRole("BD Team");
  const res = await call(`${base(poId)}/remarks`, { method: "PATCH", ...json, body: JSON.stringify(payload) });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  return { ok: true };
}

/** Saves a new unit of measure for everyone. Returns `{ name }` (the saved spelling) or `{ message }`. */
export async function addUom(name) {
  await requireRole("BD Team", "Admin");
  const res = await call("/uoms", { method: "POST", body: JSON.stringify({ name }) });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  return res.json();
}
