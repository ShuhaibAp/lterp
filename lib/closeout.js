import "server-only";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

async function get(poId, part) {
  const token = await getSessionToken();
  const res = await apiFetch(`/purchase-orders/${encodeURIComponent(poId)}/${part}`, { token });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`Could not load ${part} (${res.status})`);
  return res.json();
}

/** Module 8: `{ poNumber, poStatus, check, canAcknowledge }`; `check` is null until Factory completes. */
export const getWeighment = (poId) => get(poId, "weighment");

/** Module 9: `{ poNumber, poStatus, aor, canSend }`; `aor.dueAt` / `aor.overdue` drive the SLA display. */
export const getAor = (poId) => get(poId, "aor");

/** Module 10: `{ generated, blockers, canGenerate, canEditSignature, signature, documents }`. */
export const getFinalReports = (poId) => get(poId, "final-reports");
