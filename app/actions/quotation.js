"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { readFailure, UNREACHABLE } from "@/lib/api-errors";
import { requireRole } from "@/lib/dal";
import { getSessionToken } from "@/lib/session";

const base = (poId) => `/purchase-orders/${encodeURIComponent(poId)}/quotation`;
const page = (poId, flag) => `/purchase-orders/${poId}/quotation${flag ? `?${flag}=1` : ""}`;
const json = { headers: { "Content-Type": "application/json" } };

async function call(path, init) {
  const token = await getSessionToken();
  try {
    return await apiFetch(path, { token, ...init });
  } catch {
    return null;
  }
}

export async function prepareQuotation(poId) {
  await requireRole("BD Team");
  const res = await call(base(poId), { method: "POST" });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  redirect(page(poId));
}

/** BD saves a draft/returned quotation; Admin saves corrections to a submitted one. */
export async function saveQuotation(poId, payload) {
  await requireRole("BD Team", "Admin");
  const res = await call(base(poId), { method: "PUT", ...json, body: JSON.stringify(payload) });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  const { quotation } = await res.json();
  return { quotation };
}

/** Hands the (already autosaved) quotation to Admin for approval. */
export async function submitQuotation(poId) {
  await requireRole("BD Team");
  const res = await call(`${base(poId)}/submit`, { method: "POST" });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  redirect(page(poId, "submitted"));
}

/** Reads a PDF/Word/text file and returns its text for the Terms box; nothing is stored. */
export async function readTermsFile(poId, formData) {
  await requireRole("BD Team", "Admin");
  const body = new FormData();
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) body.append("file", file, file.name);
  const res = await call(`${base(poId)}/terms-file`, { method: "POST", body });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res, "The file is larger than 5 MB.");
  const { text, truncated, fileName } = await res.json();
  return { text, truncated, fileName };
}

export async function uploadSignature(poId, formData) {
  await requireRole("BD Team", "Admin");
  const body = new FormData();
  const file = formData.get("signature");
  if (file instanceof File && file.size > 0) body.append("signature", file, file.name);
  const res = await call(`${base(poId)}/signature`, { method: "POST", body });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res, "The signature image is larger than 2 MB.");
  const { quotation } = await res.json();
  return { signature: quotation.signature };
}

export async function removeSignature(poId) {
  await requireRole("BD Team", "Admin");
  const res = await call(`${base(poId)}/signature`, { method: "DELETE" });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  return { signature: null };
}

/** Approves the (already autosaved) quotation. */
export async function approveQuotation(poId) {
  await requireRole("Admin");
  const res = await call(`${base(poId)}/approve`, { method: "POST" });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  redirect(page(poId, "approved"));
}

/** Returns the (already autosaved) quotation to BD for revision. */
export async function returnQuotation(poId, note) {
  await requireRole("Admin");
  const res = await call(`${base(poId)}/return`, { method: "POST", ...json, body: JSON.stringify({ note }) });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  redirect(page(poId, "returned"));
}

export async function sendQuotation(poId) {
  await requireRole("Admin");
  const res = await call(`${base(poId)}/send`, { method: "POST" });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  redirect(page(poId, "sent"));
}

const CLIENT_FLASH = {
  Approved: "clientApproved",
  Rejected: "clientRejected",
  "Revision Required": "revisionRequested",
};

/** Module 4: BD or Admin records what the client decided about the sent quotation. */
export async function recordClientResponse(poId, decision, note) {
  await requireRole("BD Team", "Admin");
  const res = await call(`${base(poId)}/client-response`, {
    method: "POST",
    ...json,
    body: JSON.stringify({ decision, note }),
  });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  redirect(page(poId, CLIENT_FLASH[decision]));
}

/** Module 4: BD starts the next quotation version after the client asked for a revision. */
export async function startRevision(poId) {
  await requireRole("BD Team");
  const res = await call(`${base(poId)}/revise`, { method: "POST" });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  redirect(page(poId, "revisionStarted"));
}
