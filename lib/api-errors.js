import "server-only";
import { redirect } from "next/navigation";

export const UNREACHABLE = { message: "Cannot reach the server. Please try again shortly." };

/** Turns a failed backend response into a plain object the UI can render. Sends expired sessions to /login. */
export async function readFailure(res, tooLargeMessage = "A file is too large.") {
  if (res.status === 401) redirect("/login");
  if (res.status === 403) return { message: "You don't have permission to do that." };
  if (res.status === 413) return { message: tooLargeMessage };

  const data = await res.json().catch(() => null);
  if (data?.errors) return { errors: data.errors };
  if (data?.blockers) return { message: data.message, blockers: data.blockers };
  const message = Array.isArray(data?.message) ? data.message.join(" ") : data?.message;
  return { message: message || "Something went wrong. Please try again." };
}
