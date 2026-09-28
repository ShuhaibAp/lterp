import "server-only";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

/** `{ poNumber, poStatus, canStart, pickup }`; `pickup` is null until BD starts it. */
export async function getPickupRequest(poId) {
  const token = await getSessionToken();
  const res = await apiFetch(`/purchase-orders/${encodeURIComponent(poId)}/pickup`, { token });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`Could not load the pickup request (${res.status})`);
  return res.json();
}
