"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api";
import { readFailure, UNREACHABLE } from "@/lib/api-errors";
import { requireRole } from "@/lib/dal";
import { getSessionToken } from "@/lib/session";

async function call(path, method, body) {
  const token = await getSessionToken();
  try {
    return await apiFetch(path, { method, token, body: JSON.stringify(body) });
  } catch {
    return null;
  }
}

export async function createUser(_prev, formData) {
  await requireRole("Admin");
  const res = await call("/admin/users", "POST", {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    roles: formData.getAll("roles").map(String),
    password: String(formData.get("password") ?? ""),
  });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  redirect("/admin/users?created=1");
}

export async function updateUser(id, _prev, formData) {
  await requireRole("Admin");
  const roles = formData.getAll("roles").map(String);
  const res = await call(`/admin/users/${encodeURIComponent(id)}`, "PATCH", {
    name: String(formData.get("name") ?? ""),
    ...(roles.length > 0 ? { roles } : {}),
    active: formData.get("active") === "on",
  });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  redirect("/admin/users?updated=1");
}

export async function resetPassword(id, _prev, formData) {
  await requireRole("Admin");
  const res = await call(`/admin/users/${encodeURIComponent(id)}/password`, "POST", {
    password: String(formData.get("password") ?? ""),
  });
  if (!res) return UNREACHABLE;
  if (!res.ok) return readFailure(res);
  revalidatePath(`/admin/users/${id}`);
  return { done: true };
}
