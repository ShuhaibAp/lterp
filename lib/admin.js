import "server-only";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

async function get(path) {
  const token = await getSessionToken();
  const res = await apiFetch(path, { token });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

/** Every account: `{ id, name, email, roles, active, isCustomer }`. */
export const listUsers = () => get("/admin/users");

export async function getUser(id) {
  const user = (await listUsers()).find((u) => u.id === id);
  if (!user) notFound();
  return user;
}

/** `{ total, page, limit, items }` - filters: poNumber, action, actor, role, from, to, page. */
export function listAudit(filters = {}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) qs.set(key, String(value));
  return get(`/admin/audit?${qs}`);
}

/** `{ roles, rows: [{ capability, cells }] }` */
export const getPermissionMatrix = () => get("/admin/permissions");
