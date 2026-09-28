export const MAX_CONTACT_NAME = 120;
export const MAX_CONTACT_PHONE = 30;
export const MAX_INSTRUCTIONS = 5000;

/** ISO datetime -> the value a `<input type="datetime-local">` expects (local time, no seconds/zone). */
export function toDateTimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The reverse: a `datetime-local` value -> an ISO string the API accepts, or "" if blank. */
export function fromDateTimeLocal(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/** What is still missing before the pickup request can be generated (mirrors the server's rules). */
export function remainingPickupSteps({ collectionDateTime, contactName, contactPhone }) {
  const steps = [];
  if (!collectionDateTime) steps.push("Enter the collection date and time.");
  if (!contactName.trim()) steps.push("Enter the point of contact name.");
  if (!contactPhone.trim()) steps.push("Enter the point of contact phone number.");
  return steps;
}
