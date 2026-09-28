import { MAX_LINES, MAX_TEXT, UOMS } from "@/lib/inspection-constants";

export const MAX_PRICE = 10_000_000;
export const MAX_GST_PERCENT = 100;
export const MAX_TERMS = 5000;
export const MAX_NOTE = 1000;
export const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;
export const MAX_TERMS_FILE_BYTES = 5 * 1024 * 1024;
export const TERMS_FILE_EXTENSIONS = ["pdf", "docx", "txt"];

const QUANTITY = /^\d+(\.\d{1,3})?$/;
const PRICE = /^\d+(\.\d{1,2})?$/;
const PERCENT = /^\d+(\.\d{1,2})?$/;
export const asText = (n) => (n === null || n === undefined ? "" : String(n));

/** Quantity × unit price in exact integer math, rounded half-up to whole paise (same rule as the server). */
export function lineTotal(quantity, unitPrice) {
  const thousandths = BigInt(Math.round(quantity * 1000));
  const paise = BigInt(Math.round(unitPrice * 100));
  return Number((thousandths * paise + 500n) / 1000n) / 100;
}

/** GST on the subtotal, half-up to whole paise (same rule as the server). */
export function gstAmount(subtotal, gstPercent) {
  const paise = BigInt(Math.round(subtotal * 100));
  const rate = BigInt(Math.round(gstPercent * 100));
  return Number((paise * rate + 5000n) / 10000n) / 100;
}

/** Subtotal, GST and grand total for the editor; a blank or malformed GST field counts as no GST. */
export function quotationTotals(lineTotals, gstText) {
  const subtotal = sumTotals(lineTotals);
  const rate = gstText.trim();
  const valid = PERCENT.test(rate) && Number(rate) <= MAX_GST_PERCENT;
  const gst = valid ? gstAmount(subtotal, Number(rate)) : 0;
  return { subtotal, gstPercent: valid ? Number(rate) : null, gst, grandTotal: sumTotals([subtotal, gst]) };
}

export function sumTotals(totals) {
  return totals.reduce((sum, t) => sum + (t === null ? 0 : Math.round(t * 100)), 0) / 100;
}

export function rowFromLine(line) {
  return {
    key: line.id,
    id: line.id,
    materialName: line.materialName,
    uom: line.uom,
    quantity: asText(line.quantity),
    unitPrice: asText(line.unitPrice),
  };
}

export function blankRow(key) {
  return { key, id: null, materialName: "", uom: "", quantity: "", unitPrice: "" };
}

/** The amount for one editor row, or null while its numbers are blank or malformed. */
export function rowTotal(row) {
  const quantity = row.quantity.trim();
  const price = row.unitPrice.trim();
  if (!QUANTITY.test(quantity) || !PRICE.test(price)) return null;
  return lineTotal(Number(quantity), Number(price));
}

/** Field errors keyed like the backend's (`lines.2.unitPrice`, `terms`, `gstPercent`). */
export function validateQuotation(rows, manual, terms, gstText) {
  const errors = {};
  if (rows.length > MAX_LINES) errors.lines = `A quotation can have at most ${MAX_LINES} rows`;

  rows.forEach((row, i) => {
    const fail = (field, message) => {
      errors[`lines.${i}.${field}`] = message;
    };
    if (manual) {
      const name = row.materialName.trim();
      if (!name) fail("materialName", "Material name is required");
      else if (name.length > MAX_TEXT) fail("materialName", `Must be ${MAX_TEXT} characters or fewer`);
      if (!UOMS.includes(row.uom)) fail("uom", "Select a unit");
      const quantity = row.quantity.trim();
      if (!quantity) fail("quantity", "Required");
      else if (!QUANTITY.test(quantity)) fail("quantity", "Enter a number (up to 3 decimals)");
    }
    const price = row.unitPrice.trim();
    if (price && !PRICE.test(price)) fail("unitPrice", "Enter an amount (up to 2 decimals)");
    else if (price && Number(price) > MAX_PRICE) fail("unitPrice", "Unit price is too large");
  });

  if (terms.length > MAX_TERMS) errors.terms = `Must be ${MAX_TERMS} characters or fewer`;
  const gst = gstText.trim();
  if (gst && !PERCENT.test(gst)) errors.gstPercent = "Enter a percentage (up to 2 decimals)";
  else if (gst && Number(gst) > MAX_GST_PERCENT) errors.gstPercent = "GST cannot be more than 100%";
  return errors;
}

export function toPayload(rows, manual, terms, gstText) {
  const gst = gstText.trim();
  return {
    lines: rows.map((row) => {
      const unitPrice = row.unitPrice.trim() === "" ? null : Number(row.unitPrice);
      if (!manual) return { id: row.id, unitPrice };
      return {
        ...(row.id ? { id: row.id } : {}),
        materialName: row.materialName.trim(),
        uom: row.uom,
        quantity: Number(row.quantity),
        unitPrice,
      };
    }),
    terms,
    gstPercent: gst === "" ? null : Number(gst),
  };
}

/** What is still missing before the quotation can go to Admin (mirrors the server's rules). */
export function remainingSteps(rows) {
  const steps = [];
  if (rows.length === 0) steps.push("Add at least one item to the quotation.");
  else if (rows.some((r) => r.unitPrice.trim() === "")) steps.push("Enter a unit price for every item.");
  return steps;
}
