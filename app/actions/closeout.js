"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";
import { readFailure, UNREACHABLE } from "@/lib/api-errors";
import { requireRole } from "@/lib/dal";
import { getSessionToken } from "@/lib/session";

const base = (poId) => `/purchase-orders/${encodeURIComponent(poId)}`;

async function call(path, init) {
  const token = await getSessionToken();
  try {
    return await apiFetch(path, { token, ...init });
  } catch {
    return null;
  }
}

/** Module 8: explain a failed weighment check (Admin or BD). */
export async function acknowledgeWeighment(poId, remarks) {
  await requireRole("Admin", "BD Team");
  const res = await call(`${base(poId)}/weighment/acknowledge`, { method: "POST", body: JSON.stringify({ remarks }) });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  redirect(`/purchase-orders/${poId}/weighment?acknowledged=1`);
}

/** Module 9: Admin records that the AOR went to the client. */
export async function sendAor(poId) {
  await requireRole("Admin");
  const res = await call(`${base(poId)}/aor/send`, { method: "POST" });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  revalidatePath(`/purchase-orders/${poId}/aor`);
  return { ok: true };
}

/** Module 10: Admin triggers generation of the four documents. */
export async function generateFinalReports(poId) {
  await requireRole("Admin");
  const res = await call(`${base(poId)}/final-reports/generate`, { method: "POST" });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  redirect(`/purchase-orders/${poId}/reports?generated=1`);
}

export async function uploadReportSignature(poId, formData) {
  await requireRole("Admin");
  const body = new FormData();
  const file = formData.get("signature");
  if (file instanceof File && file.size > 0) body.append("signature", file, file.name);
  const res = await call(`${base(poId)}/final-reports/signature`, { method: "POST", body });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res, "The image is too large. It can be up to 2 MB.");
  return { signature: (await res.json()).signature };
}

export async function removeReportSignature(poId) {
  await requireRole("Admin");
  const res = await call(`${base(poId)}/final-reports/signature`, { method: "DELETE" });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  return { signature: null };
}
