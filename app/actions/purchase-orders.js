"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { readFailure, UNREACHABLE } from "@/lib/api-errors";
import { requireRole } from "@/lib/dal";
import { getSessionToken } from "@/lib/session";

const TEXT_FIELDS = ["customerName", "address", "location", "phone", "email", "serviceType", "poInstructions", "existingCustomerId", "orderRequestId"];
const TOO_LARGE = "A file is too large. Each file can be up to 25 MB.";

// Forward only the fields the backend knows about, and skip empty file slots.
function buildBody(formData) {
  const body = new FormData();
  for (const field of TEXT_FIELDS) {
    if (formData.has(field)) body.append(field, String(formData.get(field) ?? ""));
  }
  for (const id of formData.getAll("removeDocumentIds")) body.append("removeDocumentIds", String(id));
  for (const file of formData.getAll("documents")) {
    if (file instanceof File && file.size > 0) body.append("documents", file, file.name);
  }
  return body;
}

async function submit(path, method, formData) {
  const token = await getSessionToken();
  try {
    return await apiFetch(path, { method, token, body: buildBody(formData) });
  } catch {
    return null;
  }
}

export async function createPurchaseOrder(_prev, formData) {
  await requireRole("BD Team");
  const res = await submit("/purchase-orders", "POST", formData);
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res, TOO_LARGE);
  const po = await res.json();
  redirect(`/purchase-orders/${po.id}?created=1`);
}

export async function updatePurchaseOrder(id, _prev, formData) {
  await requireRole("BD Team");
  const res = await submit(`/purchase-orders/${encodeURIComponent(id)}`, "PATCH", formData);
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res, TOO_LARGE);
  redirect(`/purchase-orders/${id}?updated=1`);
}

/** Saves a new PO type for the whole BD team. Returns `{ name }` (the saved spelling) or `{ message }`. */
export async function addServiceType(name) {
  await requireRole("BD Team");
  const token = await getSessionToken();
  try {
    const res = await apiFetch("/purchase-orders/service-types", {
      method: "POST",
      token,
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return readFailure(res);
    return res.json();
  } catch {
    return UNREACHABLE;
  }
}

/** Sends (or re-sends) the customer-app invite. Returns `{ status, emailed, link?, reason? }` or `{ message }`. */
export async function inviteCustomer(poId) {
  await requireRole("BD Team", "Admin");
  const token = await getSessionToken();
  try {
    const res = await apiFetch(`/purchase-orders/${encodeURIComponent(poId)}/customer-access`, {
      method: "POST",
      token,
    });
    if (!res.ok) return readFailure(res);
    return res.json();
  } catch {
    return UNREACHABLE;
  }
}
