// The PO lifecycle in order; mirrors PoStatus in cyn-server.
export const PO_STAGES = [
  "Registration",
  "Inspection",
  "Quotation",
  "Client Response",
  "Pickup",
  "Operations",
  "Factory",
  "Weighment",
  "AOR",
  "Final Reports",
];

// Cynosure staff roles that can sign in to this app; Customer is excluded (separate portal).
export const STAFF_ROLES = ["BD Team", "Operations Team", "Factory Team", "Admin"];
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_FILES = 10;
export const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"];

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} MB`;
}

export function formatDay(iso) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export function formatDate(iso) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
}
