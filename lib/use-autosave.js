"use client";

import { useEffect, useRef, useState } from "react";

const DELAY = 1000;

/**
 * Debounced autosave for a draft editor, so the user never has to click a "Save Draft" button.
 *
 * `value` is a comparable snapshot of everything `onSave()` would send - callers pass
 * `JSON.stringify(payload())` so plain `===` works across renders. `onSave()` takes no arguments
 * (it reads the latest state itself via closure), resolves to `true` on success or `false` on
 * failure, and is expected to run its own local validation first and set field errors/a message
 * itself when it fails - the same check a manual "Save" button used to run before sending.
 * Deliberately NOT validated up front on every keystroke: a save (and so an error) is only
 * attempted after the user pauses typing, so a freshly-added blank row doesn't flash red
 * immediately.
 *
 * All saves are serialized through one in-flight promise, so autosave and an explicit action
 * (Submit/Complete/Generate) can never race each other into two concurrent writes - an explicit
 * action should `await flush()` before doing its own save, which then waits for that.
 *
 * Returns `{ status, flush }`: status is "clean" | "pending" | "saving" | "saved" | "error".
 */
export function useAutosave({ value, onSave, delay = DELAY }) {
  const [status, setStatus] = useState("clean");
  const lastSaved = useRef(value);
  const onSaveRef = useRef(onSave);
  const valueRef = useRef(value);
  const inFlight = useRef(null);
  const timerRef = useRef(null);
  onSaveRef.current = onSave;
  valueRef.current = value;

  function runSave() {
    if (inFlight.current) return inFlight.current;
    const target = valueRef.current;
    setStatus("saving");
    const promise = (async () => {
      const ok = await onSaveRef.current();
      inFlight.current = null;
      if (!ok) {
        setStatus("error");
        return false;
      }
      lastSaved.current = target;
      if (valueRef.current !== lastSaved.current) {
        runSave();
      } else {
        setStatus("saved");
      }
      return true;
    })();
    inFlight.current = promise;
    return promise;
  }

  useEffect(() => {
    if (value === lastSaved.current) return undefined;
    setStatus("pending");
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(runSave, delay);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay]);

  // Warn before leaving the page only while something genuinely isn't saved yet.
  useEffect(() => {
    if (status !== "pending" && status !== "saving" && status !== "error") return undefined;
    const warn = (e) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  async function flush() {
    clearTimeout(timerRef.current);
    if (inFlight.current) return inFlight.current;
    if (valueRef.current === lastSaved.current) return true;
    return runSave();
  }

  return { status, flush };
}

/** Bottom-bar status text for an autosave `status`; "" when there is nothing to report. */
export function autosaveLabel(status) {
  switch (status) {
    case "saving":
      return "Saving…";
    case "saved":
      return "All changes saved";
    case "pending":
      return "Unsaved changes";
    case "error":
      return "Not saved — see message above";
    default:
      return "";
  }
}
