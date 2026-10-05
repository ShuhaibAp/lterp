import "server-only";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

/** `{ poNumber, poStatus, inspection }`; `inspection` is null until the type has been chosen. */
export async function getInspection(poId) {
  const token = await getSessionToken();
  const res = await apiFetch(`/purchase-orders/${encodeURIComponent(poId)}/inspection`, { token });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`Could not load inspection (${res.status})`);
  return res.json();
}

/** Built-in units of measure followed by the ones BD has added. */
export async function getUoms() {
  const token = await getSessionToken();
  const res = await apiFetch("/uoms", { token });
  if (!res.ok) throw new Error(`Could not load units of measure (${res.status})`);
  return res.json();
}
