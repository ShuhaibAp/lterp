"use server";

import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { brand } from "@/lib/brand";
import { createSession, deleteSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/dal";

export async function login(_prevState, formData) {
  const role = String(formData.get("role") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!STAFF_ROLES.includes(role)) {
    return { error: "Select your role.", email, role };
  }
  if (!email || !password) {
    return { error: "Enter your email and password.", email, role };
  }

  let data;
  try {
    const res = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
    });
    if (res.status === 401) return { error: "Incorrect email or password.", email, role };
    if (res.status === 403) return { error: "This account isn't registered as that role.", email, role };
    if (res.status === 400) return { error: "Enter a valid email address and password.", email, role };
    if (!res.ok) return { error: "Something went wrong. Please try again.", email, role };
    data = await res.json();
  } catch {
    return { error: "Cannot reach the server. Please try again shortly.", email, role };
  }

  if (!STAFF_ROLES.includes(data.user.role)) {
    return { error: `This portal is for ${brand.staffLabel} staff. Customers should use the customer portal.`, email, role };
  }

  await createSession(data.accessToken);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
