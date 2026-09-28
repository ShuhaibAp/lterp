"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { readFailure, UNREACHABLE } from "@/lib/api-errors";
import { requireRole } from "@/lib/dal";
import { getSessionToken } from "@/lib/session";

const base = (poId) => `/purchase-orders/${encodeURIComponent(poId)}/operations`;
const page = (poId, flag) => `/purchase-orders/${poId}/operations${flag ? `?${flag}=1` : ""}`;
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

export async function startOperations(poId) {
  await requireRole("Operations Team");
  const res = await call(base(poId), { method: "POST" });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  redirect(`/purchase-orders/${poId}/operations`);
}

export async function saveOperations(poId, payload) {
  await requireRole("Operations Team");
  const res = await call(base(poId), { method: "PUT", ...json, body: JSON.stringify(payload) });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  const data = await res.json();
  return { operations: data.operations };
}

export async function saveCollectionExpenses(poId, lines) {
  await requireRole("Operations Team");
  const res = await call(`${base(poId)}/collection-expenses`, { method: "PUT", ...json, body: JSON.stringify({ lines }) });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  const data = await res.json();
  return { operations: data.operations };
}

export async function saveLogisticsExpenses(poId, lines) {
  await requireRole("Operations Team");
  const res = await call(`${base(poId)}/logistics-expenses`, { method: "PUT", ...json, body: JSON.stringify({ lines }) });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  const data = await res.json();
  return { operations: data.operations };
}

export async function uploadOperationsPhotos(poId, formData) {
  await requireRole("Operations Team");
  const res = await call(`${base(poId)}/photos`, { method: "POST", body: onlyFiles(formData, "photos") });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res, "A photo is too large. Each photo can be up to 25 MB.");
  const { operations } = await res.json();
  return { photos: operations.photos };
}

export async function removeOperationsPhoto(poId, photoId) {
  await requireRole("Operations Team");
  const res = await call(`${base(poId)}/photos/${encodeURIComponent(photoId)}`, { method: "DELETE" });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  const { operations } = await res.json();
  return { photos: operations.photos };
}

export async function uploadForm6Document(poId, formData) {
  await requireRole("Operations Team");
  const res = await call(`${base(poId)}/form6-document`, { method: "POST", body: onlyFiles(formData, "form6") });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res, "The file is too large. It can be up to 25 MB.");
  const { operations } = await res.json();
  return { operations };
}

export async function removeForm6Document(poId) {
  await requireRole("Operations Team");
  const res = await call(`${base(poId)}/form6-document`, { method: "DELETE" });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  const { operations } = await res.json();
  return { operations };
}

export async function completeOperations(poId) {
  await requireRole("Operations Team");
  const res = await call(`${base(poId)}/complete`, { method: "POST" });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  redirect(page(poId, "completed"));
}
