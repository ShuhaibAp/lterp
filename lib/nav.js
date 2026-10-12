// Add an entry here when a module's screen is built. `roles` controls who sees it.
const ALL_STAFF = ["BD Team", "Operations Team", "Factory Team", "Admin"];

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "dashboard", roles: ALL_STAFF },
  { href: "/purchase-orders", label: "PO List", icon: "orders", roles: ["BD Team", "Admin", "Operations Team", "Factory Team"] },
  { href: "/purchase-orders/new", label: "New PO", icon: "plus-circle", roles: ["BD Team"] },
  { href: "/quotations", label: "Approvals", icon: "approvals", roles: ["Admin"] },
  { href: "/admin/users", label: "Users", icon: "users", roles: ["Admin"] },
  { href: "/admin/permissions", label: "Permissions", icon: "shield", roles: ["Admin"] },
  { href: "/admin/audit", label: "Audit log", icon: "clock", roles: ["Admin"] },
  // `badge` names a count the layout supplies (see app/(app)/layout.js).
  { href: "/order-requests", label: "Order requests", icon: "inbox", roles: ["BD Team", "Admin"], badge: "orderRequests" },
];

export function navForRole(role) {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

// The most specific nav item wins, so /purchase-orders/new highlights "New PO"
// while /purchase-orders and /purchase-orders/<id> highlight "PO List".
export function activeHref(pathname, items) {
  const matches = items.filter((item) =>
    item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  matches.sort((a, b) => b.href.length - a.href.length);
  return matches[0]?.href ?? null;
}

export function titleForPath(pathname) {
  if (pathname === "/admin/users/new") return "New user";
  if (/^\/admin\/users\/[^/]+$/.test(pathname)) return "Edit user";
  if (/^\/purchase-orders\/[^/]+\/edit$/.test(pathname)) return "Edit PO";
  if (/^\/purchase-orders\/(?!new$)[^/]+(\/inspection|\/quotation|\/pickup|\/operations|\/factory)?$/.test(pathname)) return "Purchase Order";
  const match = NAV_ITEMS.find((item) => item.href === pathname);
  return match ? match.label : "Cynosure MIS";
}
