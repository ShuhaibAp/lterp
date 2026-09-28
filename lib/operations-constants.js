export const MAX_TEXT = 200;
export const MAX_REMARKS = 1000;
export const MAX_AMOUNT = 10_000_000_000;

// FR-06.04: fields captured after collection, beyond Pickup Date (shown separately, with the
// countdown) and the acknowledgement (its own checkbox at the top of the tab).
export const COLLECTION_FIELDS = [
  { key: "invoiceNumber", label: "Invoice Number", type: "text" },
  { key: "invoiceDate", label: "Invoice Date", type: "date" },
  { key: "invoiceAmount", label: "Invoice Amount (₹)", type: "money" },
  { key: "ewayBillNumber", label: "E-Way Bill Number", type: "text" },
  { key: "form6Number", label: "Form 6 Number", type: "text", required: true },
  { key: "lrNumber", label: "LR Number", type: "text" },
  { key: "mplNumber", label: "MPL Number", type: "text" },
  { key: "vehicleNumber", label: "Vehicle Number", type: "text" },
  { key: "weighmentSlipEmptyNumber", label: "Weighment Slip – Empty Number", type: "text" },
  { key: "weighmentSlipLoadNumber", label: "Weighment Slip – Load Number", type: "text" },
  // The actual gross weight (kg) read off those slips, as opposed to the reference numbers
  // above - captured by Operations at pickup; Factory re-weighs on arrival as its own accuracy
  // check before processing (Module 07).
  { key: "weighmentEmptyKg", label: "Empty Weight (kg)", type: "weight", required: true },
  { key: "weighmentLoadedKg", label: "Loaded Weight (kg)", type: "weight", required: true },
  { key: "padlockSerialNumber", label: "Padlock Serial Number", type: "text" },
];

/** ISO datetime -> the value a `<input type="date">` expects (YYYY-MM-DD, local calendar date). */
export function toDateOnly(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The reverse: a `date` input value -> an ISO string the API accepts, or "" if blank. */
export function fromDateOnly(value) {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/**
 * BR-06.01: always measures days-to-scheduled-date, never days-since-PO-creation. `iso` is the
 * Module 5 Pickup Request's scheduled collection date/time, not this module's own Pickup Date
 * (which is only filled in after collection actually happens).
 */
function daysUntil(iso) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const target = new Date(iso);
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((startOfTarget - startOfToday) / msPerDay);
}

export function collectionCountdown(iso) {
  if (!iso) return null;
  const days = daysUntil(iso);
  if (days > 1) return { text: `${days} days to scheduled collection`, tone: "info" };
  if (days === 1) return { text: "Scheduled for tomorrow", tone: "warn" };
  if (days === 0) return { text: "Scheduled for today", tone: "warn" };
  const overdue = Math.abs(days);
  return { text: `${overdue} ${overdue === 1 ? "day" : "days"} overdue`, tone: "bad" };
}

/** Same as {@link collectionCountdown} but a short label for compact spaces like the PO List table. */
export function collectionCountdownShort(iso) {
  if (!iso) return null;
  const days = daysUntil(iso);
  if (days > 1) return { text: `${days}d to pickup`, tone: "info" };
  if (days === 1) return { text: "Pickup tomorrow", tone: "warn" };
  if (days === 0) return { text: "Pickup today", tone: "warn" };
  const overdue = Math.abs(days);
  return { text: `${overdue}d overdue`, tone: "bad" };
}

/** Loaded − Empty, or null until both weights are entered. */
export function netWeightKg(emptyKg, loadedKg) {
  const empty = Number(emptyKg);
  const loaded = Number(loadedKg);
  if (!Number.isFinite(empty) || !Number.isFinite(loaded)) return null;
  return Math.round((loaded - empty) * 100) / 100;
}

export function remainingOperationsSteps({
  acknowledged,
  pickupDate,
  lines,
  weighmentEmptyKg,
  weighmentLoadedKg,
  form6Number,
}) {
  const steps = [];
  if (!acknowledged) steps.push("Acknowledge the Inspection Report.");
  if (!pickupDate) steps.push("Enter the Pickup Date.");
  if (lines.length > 0 && lines.some((l) => l.actualQuantity.trim() === "")) {
    steps.push("Enter the actual quantity for every material.");
  }
  if (weighmentEmptyKg.trim() === "") steps.push("Enter the Empty Weight (kg).");
  if (weighmentLoadedKg.trim() === "") steps.push("Enter the Loaded Weight (kg).");
  if (form6Number.trim() === "") steps.push("Enter the Form 6 Number.");
  return steps;
}
