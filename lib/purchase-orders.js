import "server-only";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

export async function listPurchaseOrders({ search = "", status = "", page = 1 } = {}) {
  const token = await getSessionToken();
  const qs = new URLSearchParams({ page: String(page), limit: "20" });
  if (search) qs.set("search", search);
  if (status) qs.set("status", status);
  const res = await apiFetch(`/purchase-orders?${qs}`, { token });
  if (!res.ok) throw new Error(`Could not load purchase orders (${res.status})`);
  return res.json();
}

/** `{ total, byStatus: [{ status, count }], recent: [...] }` for the dashboard. */
export async function getPoSummary() {
  const token = await getSessionToken();
  const res = await apiFetch("/purchase-orders/summary", { token });
  if (!res.ok) throw new Error(`Could not load the dashboard (${res.status})`);
  return res.json();
}

export async function getPurchaseOrder(id) {
  const token = await getSessionToken();
  const res = await apiFetch(`/purchase-orders/${encodeURIComponent(id)}`, { token });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`Could not load purchase order (${res.status})`);
  return res.json();
}
