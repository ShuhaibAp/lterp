"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "./Icon";
import styles from "./ColumnMappingModal.module.css";

/**
 * Generic "confirm which column is which" step for any spreadsheet upload. Works whether the
 * file's headers were recognised, are in a different order, or the file has no header row at
 * all — the caller supplies `fields` (what needs mapping) and a `preview` from the backend's
 * two-step import endpoint ({ matrix, totalRows, truncated, suggested: { headerRow, columns } }).
 * `onConfirm({ headerRow, columns })` fires with the user's final choices.
 */

function columnLetter(index) {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

export default function ColumnMappingModal({ fileName, preview, fields, pending, error, onCancel, onConfirm }) {
  const { matrix, totalRows, truncated, suggested } = preview;
  const [headerRow, setHeaderRow] = useState(suggested.headerRow);
  const [columns, setColumns] = useState(() => ({ ...suggested.columns }));

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const columnCount = Math.max(1, ...matrix.map((row) => row.length));
  const firstDataRow = matrix[headerRow + 1] ?? matrix[0] ?? [];

  function columnLabel(colIndex) {
    const headerText = headerRow >= 0 ? (matrix[headerRow]?.[colIndex] ?? "").trim() : "";
    const base = headerText || `Column ${columnLetter(colIndex)}`;
    const sample = (firstDataRow[colIndex] ?? "").trim();
    return sample ? `${base} — e.g. "${sample}"` : base;
  }

  const headerRowOptions = useMemo(() => {
    const opts = [{ value: -1, label: "No header row — data starts at row 1" }];
    matrix.forEach((row, i) => {
      const sample = row.filter((c) => c.trim()).slice(0, 4).join(", ");
      opts.push({ value: i, label: `Row ${i + 1}${sample ? `: ${sample}` : ""}` });
    });
    return opts;
  }, [matrix]);

  const previewRows = matrix.slice(headerRow + 1, headerRow + 1 + 5);
  const materialField = fields.find((f) => f.required);
  const blockConfirm = materialField && columns[materialField.key] === -1;

  function setColumn(key, value) {
    setColumns((prev) => ({ ...prev, [key]: Number(value) }));
  }

  return (
    <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="mapping-title">
        <div className={styles.head}>
          <div>
            <h2 id="mapping-title" className={styles.title}>
              Match your file&rsquo;s columns
            </h2>
            <p className={styles.fileMeta}>
              <strong>{fileName}</strong> · {totalRows} {totalRows === 1 ? "row" : "rows"}
              {truncated ? " (showing a preview)" : ""}
            </p>
          </div>
          <button type="button" className={styles.close} onClick={onCancel} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.section}>
            <label className={styles.label} htmlFor="mapping-header-row">
              Header row
            </label>
            <select
              id="mapping-header-row"
              className={styles.select}
              value={headerRow}
              onChange={(e) => setHeaderRow(Number(e.target.value))}
            >
              {headerRowOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.section}>
            <div className={styles.fieldsGrid}>
              {fields.map((field) => (
                <div key={field.key}>
                  <label className={styles.label} htmlFor={`mapping-${field.key}`}>
                    {field.label} {field.required && <span aria-hidden="true">*</span>}
                  </label>
                  <select
                    id={`mapping-${field.key}`}
                    className={styles.select}
                    value={columns[field.key] ?? -1}
                    onChange={(e) => setColumn(field.key, e.target.value)}
                  >
                    <option value={-1}>Not in this file</option>
                    {Array.from({ length: columnCount }, (_, i) => (
                      <option key={i} value={i}>
                        {columnLabel(i)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {blockConfirm && (
              <div className={styles.warn} role="alert">
                Select a column for {materialField.label} to continue.
              </div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.label}>Preview</div>
            <div className={styles.previewWrap}>
              {previewRows.length === 0 ? (
                <div className={styles.previewEmpty}>No data rows below the selected header row.</div>
              ) : (
                <div className={styles.previewScroll}>
                  <table className={styles.previewTable}>
                    <thead>
                      <tr>
                        {fields.map((field) => (
                          <th key={field.key} className={columns[field.key] === -1 ? styles.unmapped : undefined}>
                            {field.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i}>
                          {fields.map((field) => {
                            const col = columns[field.key];
                            const value = col === -1 || col === undefined ? "" : (row[col] ?? "");
                            return <td key={field.key}>{value.trim() || "—"}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className={styles.warn} role="alert">
              {error}
            </div>
          )}
        </div>

        <div className={styles.foot}>
          <span className={styles.note}>Nothing is imported until you confirm.</span>
          <span className={styles.footActions}>
            <button type="button" className={styles.btn} onClick={onCancel} disabled={pending}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={pending || blockConfirm}
              onClick={() => onConfirm({ headerRow, columns })}
            >
              {pending ? "Importing…" : "Import rows"}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
