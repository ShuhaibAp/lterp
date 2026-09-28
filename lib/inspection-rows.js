import { MAX_LINES, MAX_REMARKS, MAX_TEXT, UOMS } from "@/lib/inspection-constants";

const QUANTITY = /^\d+(\.\d{1,3})?$/;
const MONEY = /^\d+(\.\d{1,2})?$/;
const asText = (n) => (n === null || n === undefined ? "" : String(n));

/** Editor rows keep numbers as text so half-typed values ("12.") are never mangled. */
export function rowFromLine(line) {
  return {
    key: line.id,
    id: line.id,
    materialName: line.materialName,
    uom: line.uom,
    clientQuantity: asText(line.clientQuantity),
    inspectedQuantity: asText(line.inspectedQuantity),
    remarks: line.remarks ?? "",
  };
}

export function blankRow(key, values = {}) {
  return { key, id: null, materialName: "", uom: "", clientQuantity: "", inspectedQuantity: "", remarks: "", ...values };
}

/** Field errors keyed like the backend's (`lines.2.clientQuantity`, `expenseTotal`). */
export function validateRows(rows, acknowledged, expense) {
  const errors = {};
  if (rows.length > MAX_LINES) errors.lines = `An inspection list can have at most ${MAX_LINES} rows`;

  rows.forEach((row, i) => {
    const fail = (field, message) => {
      errors[`lines.${i}.${field}`] = message;
    };
    const name = row.materialName.trim();
    if (!name) fail("materialName", "Material name is required");
    else if (name.length > MAX_TEXT) fail("materialName", `Must be ${MAX_TEXT} characters or fewer`);

    if (!UOMS.includes(row.uom)) fail("uom", "Select a unit");

    const client = row.clientQuantity.trim();
    if (!client) fail("clientQuantity", "Required");
    else if (!QUANTITY.test(client)) fail("clientQuantity", "Enter a number (up to 3 decimals)");

    const inspected = row.inspectedQuantity.trim();
    if (acknowledged && inspected && !QUANTITY.test(inspected)) {
      fail("inspectedQuantity", "Enter a number (up to 3 decimals)");
    }
    if (row.remarks.length > MAX_REMARKS) fail("remarks", `Must be ${MAX_REMARKS} characters or fewer`);
  });

  const amount = expense.trim();
  if (amount && !MONEY.test(amount)) errors.expenseTotal = "Enter an amount (up to 2 decimals)";
  return errors;
}

export function toPayload(rows, acknowledged, expense) {
  return {
    lines: rows.map((row) => ({
      ...(row.id ? { id: row.id } : {}),
      materialName: row.materialName.trim(),
      uom: row.uom,
      clientQuantity: Number(row.clientQuantity),
      inspectedQuantity: acknowledged && row.inspectedQuantity.trim() !== "" ? Number(row.inspectedQuantity) : null,
      remarks: row.remarks,
    })),
    acknowledged,
    expenseTotal: expense.trim() === "" ? null : Number(expense),
  };
}

/** What is still missing before the inspection can be completed (mirrors the server's rules). */
export function remainingSteps(rows, acknowledged, expense) {
  const steps = [];
  if (!acknowledged) steps.push('Tick "I acknowledge that the inspection process is complete".');
  if (rows.length === 0) steps.push("Add at least one material to the inspection list.");
  else if (rows.some((r) => r.inspectedQuantity.trim() === "")) steps.push("Enter the inspected quantity for every material.");
  if (expense.trim() === "") steps.push("Enter the inspection expense.");
  return steps;
}
