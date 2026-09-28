import "server-only";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

/** `{ poNumber, poStatus, canPrepare, inspectionType, quotation }`; `quotation` is null until BD prepares it. */
export async function getQuotation(poId) {
  const token = await getSessionToken();
  const res = await apiFetch(`/purchase-orders/${encodeURIComponent(poId)}/quotation`, { token });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`Could not load quotation (${res.status})`);
  return res.json();
}

/** Quotations waiting for Admin's decision, oldest first. */
export async function listPendingQuotations() {
  const token = await getSessionToken();
  const res = await apiFetch("/quotations", { token });
  if (!res.ok) throw new Error(`Could not load the approval queue (${res.status})`);
  return res.json();
}
