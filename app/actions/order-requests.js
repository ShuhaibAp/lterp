"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";
import { readFailure, UNREACHABLE } from "@/lib/api-errors";
import { requireRole } from "@/lib/dal";
import { getSessionToken } from "@/lib/session";

/** BD: the request was dealt with without creating a PO from it (e.g. sorted out by phone). */
export async function markRequestHandled(id) {
  await requireRole("BD Team");
  const token = await getSessionToken();
  try {
    const res = await apiFetch(`/order-requests/${encodeURIComponent(id)}/handled`, { method: "POST", token });
    if (!res.ok) return readFailure(res);
  } catch {
    return UNREACHABLE;
  }
  revalidatePath("/order-requests");
  return { ok: true };
}
