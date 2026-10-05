"use client";

import { useState } from "react";
import { addUom } from "@/app/actions/inspection";
import styles from "./UomSelect.module.css";

const ADD_NEW = "__add_new__";

/**
 * A unit-of-measure dropdown with a "+ Add new unit…" option. A new unit is saved for the
 * whole BD team straight away (see POST /uoms), then added to `uoms` and selected.
 */
export default function UomSelect({ value, uoms, onChange, onUomsChange, className, label, invalid }) {
  const [draft, setDraft] = useState(null); // null = closed, otherwise the text being typed
  const [problem, setProblem] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const name = draft.trim().replace(/\s+/g, " ");
    if (!name) {
      setProblem("Enter a unit");
      return;
    }
    setSaving(true);
    const result = await addUom(name);
    setSaving(false);
    if (!result?.name) {
      setProblem(result?.message ?? "Could not save the unit");
      return;
    }
    if (!uoms.includes(result.name)) onUomsChange([...uoms, result.name]);
    onChange(result.name);
    setDraft(null);
  }

  if (draft !== null) {
    return (
      <div className={styles.adding}>
        <div className={styles.addRow}>
          <input
            className={`${className} ${problem ? styles.bad : ""}`}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setProblem("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              } else if (e.key === "Escape") {
                setDraft(null);
              }
            }}
            placeholder="New unit"
            maxLength={30}
            autoFocus
            aria-label={`New ${label.toLowerCase()}`}
            aria-invalid={!!problem}
          />
          <button type="button" className={styles.btn} onClick={save} disabled={saving} aria-label="Save unit">
            ✓
          </button>
          <button type="button" className={styles.btn} onClick={() => setDraft(null)} disabled={saving} aria-label="Cancel">
            ✕
          </button>
        </div>
        {problem && (
          <div className={styles.problem} role="alert">
            {problem}
          </div>
        )}
      </div>
    );
  }

  return (
    <select
      className={className}
      value={value}
      onChange={(e) => {
        if (e.target.value === ADD_NEW) {
          setDraft("");
          setProblem("");
        } else {
          onChange(e.target.value);
        }
      }}
      aria-label={label}
      aria-invalid={invalid}
    >
      <option value="">Select…</option>
      {uoms.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
      <option value={ADD_NEW}>+ Add new unit…</option>
    </select>
  );
}
