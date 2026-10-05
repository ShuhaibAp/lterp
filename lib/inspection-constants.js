export const LIST_EXTENSIONS = ["xlsx", "csv"];
export const PHOTO_EXTENSIONS = ["jpg", "jpeg", "png"];
export const MAX_LIST_BYTES = 10 * 1024 * 1024;
export const MAX_LINES = 1000;
export const MAX_TEXT = 200;
export const MAX_REMARKS = 1000;
export const MAX_PHOTO_LABEL = 120;

export function formatMoney(amount) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

export function formatQuantity(n) {
  return n === null || n === undefined ? "—" : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(n);
}
