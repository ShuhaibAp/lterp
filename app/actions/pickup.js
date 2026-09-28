"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { readFailure, UNREACHABLE } from "@/lib/api-errors";
import { requireRole } from "@/lib/dal";
import { getSessionToken } from "@/lib/session";

const base = (poId) => `/purchase-orders/${encodeURIComponent(poId)}/pickup`;
const page = (poId, flag) => `/purchase-orders/${poId}/pickup${flag ? `?${flag}=1` : ""}`;
const json = { headers: { "Content-Type": "application/json" } };

async function call(path, init) {
  const token = await getSessionToken();
  try {
    return await apiFetch(path, { token, ...init });
  } catch {
    return null;
  }
}

export async function startPickupRequest(poId) {
  await requireRole("BD Team");
  const res = await call(base(poId), { method: "POST" });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  redirect(page(poId));
}

export async function savePickupRequest(poId, payload) {
  await requireRole("BD Team");
  const res = await call(base(poId), { method: "PUT", ...json, body: JSON.stringify(payload) });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  const data = await res.json();
  return { pickup: data.pickup };
}

export async function generatePickupReport(poId) {
  await requireRole("BD Team");
  const res = await call(`${base(poId)}/generate`, { method: "POST" });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  redirect(page(poId, "generated"));
}
