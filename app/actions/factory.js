"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { readFailure, UNREACHABLE } from "@/lib/api-errors";
import { requireRole } from "@/lib/dal";
import { getSessionToken } from "@/lib/session";

const base = (poId) => `/purchase-orders/${encodeURIComponent(poId)}/factory`;
const page = (poId, flag) => `/purchase-orders/${poId}/factory${flag ? `?${flag}=1` : ""}`;
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

export async function startFactory(poId) {
  await requireRole("Factory Team");
  const res = await call(base(poId), { method: "POST" });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  redirect(`/purchase-orders/${poId}/factory`);
}

export async function saveFactory(poId, payload) {
  await requireRole("Factory Team");
  const res = await call(base(poId), { method: "PUT", ...json, body: JSON.stringify(payload) });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  const data = await res.json();
  return { factory: data.factory };
}

export async function uploadFactorySlip(poId, kind, formData) {
  await requireRole("Factory Team");
  const res = await call(`${base(poId)}/slips/${encodeURIComponent(kind)}`, {
    method: "POST",
    body: onlyFiles(formData, "slip"),
  });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res, "The file is too large. It can be up to 25 MB.");
  const { factory } = await res.json();
  return { factory };
}

export async function removeFactorySlip(poId, kind) {
  await requireRole("Factory Team");
  const res = await call(`${base(poId)}/slips/${encodeURIComponent(kind)}`, { method: "DELETE" });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  const { factory } = await res.json();
  return { factory };
}

export async function uploadFactoryPhotos(poId, formData) {
  await requireRole("Factory Team");
  const res = await call(`${base(poId)}/photos`, { method: "POST", body: onlyFiles(formData, "photos") });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res, "A photo is too large. Each photo can be up to 25 MB.");
  const { factory } = await res.json();
  return { photos: factory.photos };
}

export async function removeFactoryPhoto(poId, photoId) {
  await requireRole("Factory Team");
  const res = await call(`${base(poId)}/photos/${encodeURIComponent(photoId)}`, { method: "DELETE" });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  const { factory } = await res.json();
  return { photos: factory.photos };
}

/** Admin only (BR-07.02): replaces the whole Teardown Log. */
export async function saveTeardownLog(poId, entries) {
  await requireRole("Admin");
  const res = await call(`${base(poId)}/teardown-log`, { method: "PUT", ...json, body: JSON.stringify({ entries }) });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  const { factory } = await res.json();
  return { teardownLog: factory.teardownLog };
}

export async function completeFactory(poId) {
  await requireRole("Factory Team");
  const res = await call(`${base(poId)}/complete`, { method: "POST" });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  redirect(page(poId, "completed"));
}
