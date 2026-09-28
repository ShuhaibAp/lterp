import "server-only";
import { apiFetch } from "@/lib/api";
import { getUser } from "@/lib/dal";
import { getSessionToken } from "@/lib/session";

const DEFAULT_ROLES = ["BD Team", "Admin"];

/**
 * Streams a file from the backend to the browser. The session cookie is httpOnly,
 * so files can't be fetched by the browser directly and have to pass through here.
 * `allowedRoles` should mirror the backend route's own `@Roles(...)` guard - it defaults to
 * BD/Admin only, so any route that also grants a staff role (e.g. Operations Team viewing its
 * own uploads) must pass that role explicitly or its users get a 403 before ever reaching the API.
 */
export async function proxyBackendFile(path, allowedRoles = DEFAULT_ROLES) {
  const user = await getUser();
  if (!user) return new Response(null, { status: 401 });
  if (!allowedRoles.includes(user.role)) return new Response(null, { status: 403 });

  const token = await getSessionToken();
  const res = await apiFetch(path, { token });
  if (!res.ok) return new Response(null, { status: [401, 403, 404].includes(res.status) ? res.status : 502 });

  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": res.headers.get("content-disposition") ?? "inline",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
