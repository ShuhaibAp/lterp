import "server-only";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

/**
 * `{ poNumber, poStatus, poInstructions, canStart, canWriteTeardownLog, factory }`;
 * `factory` is null until Factory starts it, and its `teardownLog` is null for roles that may not see it.
 */
export async function getFactoryRecord(poId) {
  const token = await getSessionToken();
  const res = await apiFetch(`/purchase-orders/${encodeURIComponent(poId)}/factory`, { token });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`Could not load Factory data (${res.status})`);
  return res.json();
}
