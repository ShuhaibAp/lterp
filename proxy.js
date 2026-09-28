import { NextResponse } from "next/server";
import { isTokenExpired } from "@/lib/jwt";

const SESSION_COOKIE = "cyn_session";

// Optimistic check only: no valid-looking session cookie -> /login.
// Real verification happens in lib/dal.js against the backend.
export function proxy(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const { pathname } = request.nextUrl;

  if (pathname === "/login") return NextResponse.next();

  if (!token || isTokenExpired(token)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|ico|webp)$).*)",
      // Server Actions skip the proxy: it would buffer (and past 10 MB, silently truncate)
      // upload bodies. Every action re-checks the session itself via lib/dal.js.
      missing: [{ type: "header", key: "next-action" }],
    },
  ],
};
