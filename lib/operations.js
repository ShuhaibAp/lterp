import "server-only";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

/** `{ poNumber, poStatus, canStart, operations }`; `operations` is null until Operations starts it. */
export async function getOperationsRecord(poId) {
  const token = await getSessionToken();
  const res = await apiFetch(`/purchase-orders/${encodeURIComponent(poId)}/operations`, { token });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`Could not load Operations data (${res.status})`);
  return res.json();
}
