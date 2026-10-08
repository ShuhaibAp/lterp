"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { addServiceType, createPurchaseOrder, updatePurchaseOrder } from "@/app/actions/purchase-orders";
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_BYTES,
  MAX_FILES,
  formatBytes,
} from "@/lib/po-constants";
import Icon from "./Icon";
import LockIcon from "./LockIcon";
import StatusPill from "./StatusPill";
import styles from "./PoForm.module.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ADD_NEW = "__add_new__";

function validate(v, serviceTypes) {
  const errors = {};
  if (!v.customerName.trim()) errors.customerName = "Customer name is required";
  if (!v.phone.trim()) errors.phone = "Phone number is required";
  if (!v.address.trim()) errors.address = "Address is required";
  if (!v.email.trim()) errors.email = "Email address is required";
  else if (!EMAIL_RE.test(v.email.trim())) errors.email = "Enter a valid email address";
  if (!serviceTypes.includes(v.serviceType)) errors.serviceType = "Select a service type";
  return errors;
}

function Field({ label, required, optional, error, children, htmlFor }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
        {required && <span className={styles.req}> *</span>}
        {optional && <span className={styles.opt}> (optional)</span>}
      </label>
      {children}
      {error && (
        <div className={styles.fieldError} id={`${htmlFor}-error`} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export default function PoForm({
  mode,
  po,
  serviceTypes: initialServiceTypes,
  returningCustomers = [],
  initialReturningId = "",
  requestId = "",
  customerLocked = false,
}) {
  const isEdit = mode === "edit";
  const action = isEdit ? updatePurchaseOrder.bind(null, po.id) : createPurchaseOrder;
  const [state, formAction, pending] = useActionState(action, undefined);

  // A returning customer (already has a customer-app login) fills the form with their latest details.
  const start = isEdit ? null : returningCustomers.find((c) => c.id === initialReturningId);
  const [returningId, setReturningId] = useState(start?.id ?? "");
  // Name and email identify a customer who has a login, so they can't be retyped on a PO.
  const identityLocked = customerLocked || !!returningId;

  const [values, setValues] = useState({
    customerName: po?.customer.name ?? start?.name ?? "",
    phone: po?.customer.phone ?? start?.phone ?? "",
    address: po?.customer.address ?? start?.address ?? "",
    location: po?.customer.location ?? start?.location ?? "",
    email: po?.customer.email ?? start?.email ?? "",
    serviceType: po?.serviceType ?? "",
    poInstructions: po?.poInstructions ?? "",
  });
  const [errors, setErrors] = useState({});
  const [serviceTypes, setServiceTypes] = useState(initialServiceTypes);
  const [newType, setNewType] = useState(null); // null = closed, otherwise the text being typed
  const [newTypeError, setNewTypeError] = useState("");
  const [savingType, setSavingType] = useState(false);
  const [files, setFiles] = useState([]);
  const [fileProblems, setFileProblems] = useState([]);
  const [removedIds, setRemovedIds] = useState([]);
  const [dragging, setDragging] = useState(false);

  // Show the latest server response's field errors (adjust state during render, not in an effect).
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    setErrors(state?.errors ?? {});
  }

  const fileInput = useRef(null);
  const alertRef = useRef(null);
  const nextFileId = useRef(1);
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  useEffect(
    () => () => filesRef.current.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl)),
    [],
  );
  useEffect(() => {
    if (state?.message) alertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state]);

  function setValue(name) {
    return (e) => {
      const value = e.target.value;
      setValues((v) => ({ ...v, [name]: value }));
      setErrors((prev) => {
        if (!prev[name]) return prev;
        const { [name]: _removed, ...rest } = prev;
        return rest;
      });
    };
  }

  function chooseServiceType(e) {
    if (e.target.value === ADD_NEW) {
      setNewType("");
      setNewTypeError("");
    } else {
      setNewType(null);
      setValue("serviceType")(e);
    }
  }

  async function saveNewType() {
    const name = newType.trim().replace(/s+/g, " ");
    if (!name) {
      setNewTypeError("Enter a name for the new type");
      return;
    }
    setSavingType(true);
    const result = await addServiceType(name);
    setSavingType(false);
    if (!result?.name) {
      setNewTypeError(result?.message ?? "Could not save the new type");
      return;
    }
    setServiceTypes((list) => (list.includes(result.name) ? list : [...list, result.name]));
    setValues((v) => ({ ...v, serviceType: result.name }));
    setErrors(({ serviceType: _removed, ...rest }) => rest);
    setNewType(null);
  }

  function chooseReturning(e) {
    const picked = returningCustomers.find((c) => c.id === e.target.value);
    setErrors({});
    if (!picked) {
      // Back to a new customer: clear what the previous pick filled in.
      setReturningId("");
      setValues((v) => ({ ...v, customerName: "", phone: "", address: "", location: "", email: "" }));
      return;
    }
    setReturningId(picked.id);
    setValues((v) => ({
      ...v,
      customerName: picked.name,
      phone: picked.phone,
      address: picked.address,
      location: picked.location,
      email: picked.email,
    }));
  }

  function addFiles(list) {
    const problems = [];
    const accepted = [];
    for (const file of Array.from(list)) {
      const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
      if (!ALLOWED_EXTENSIONS.includes(ext)) problems.push(`"${file.name}" — only PDF, JPG and PNG files are allowed.`);
      else if (file.size === 0) problems.push(`"${file.name}" is empty.`);
      else if (file.size > MAX_FILE_BYTES) problems.push(`"${file.name}" is larger than ${formatBytes(MAX_FILE_BYTES)}.`);
      else accepted.push(file);
    }
    const room = Math.max(MAX_FILES - files.length, 0);
    if (accepted.length > room) {
      problems.push(`You can add up to ${MAX_FILES} new files per save.`);
      accepted.length = room;
    }
    setFiles((prev) => [
      ...prev,
      ...accepted.map((file) => ({
        id: nextFileId.current++,
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      })),
    ]);
    setFileProblems(problems);
  }

  function removeFile(id) {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
    setFileProblems([]);
  }

  function toggleRemoveExisting(id) {
    setRemovedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleSubmit(formData) {
    if (newType !== null) {
      setNewTypeError("Add the new type, or cancel, before saving");
      document.getElementById("po-serviceType")?.focus();
      return;
    }
    const found = validate(values, serviceTypes);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      const first = ["customerName", "phone", "address", "email", "serviceType"].find((k) => found[k]);
      document.getElementById(`po-${first}`)?.focus();
      return;
    }
    formData.delete("documents");
    for (const f of files) formData.append("documents", f.file);
    for (const id of removedIds) formData.append("removeDocumentIds", id);
    formAction(formData);
  }

  const keptExisting = (po?.documents ?? []).filter((d) => !removedIds.includes(d.id));
  const attachedCount = keptExisting.length + files.length;
  const cancelHref = isEdit ? `/purchase-orders/${po.id}` : "/purchase-orders";

  return (
    <form action={handleSubmit} noValidate className={styles.layout}>
      <div className={styles.main}>
        {state?.message && (
          <div className={styles.alert} role="alert" ref={alertRef}>
            {state.message}
          </div>
        )}

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Customer details</h2>
          <p className={styles.cardHint}>Who the purchase order is from and how to reach them.</p>

          {!isEdit && returningCustomers.length > 0 && (
            <Field label="Returning customer" optional htmlFor="po-returning">
              <select id="po-returning" className={styles.input} value={returningId} onChange={chooseReturning}>
                <option value="">New customer</option>
                {returningCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.email}
                  </option>
                ))}
              </select>
              {returningId && (
                <p className={styles.cardHint}>
                  Showing their latest details. Changes to the address, location or phone are saved for their next order too.
                </p>
              )}
            </Field>
          )}
          {returningId && <input type="hidden" name="existingCustomerId" value={returningId} />}
          {requestId && <input type="hidden" name="orderRequestId" value={requestId} />}

          <Field label="Customer name" required error={errors.customerName} htmlFor="po-customerName">
            <input
              id="po-customerName"
              name="customerName"
              className={`${styles.input} ${errors.customerName ? styles.invalid : ""}`}
              value={values.customerName}
              onChange={setValue("customerName")}
              readOnly={identityLocked}
              placeholder="e.g. Wipro Asset Recovery"
              maxLength={200}
              aria-invalid={!!errors.customerName}
              aria-describedby={errors.customerName ? "po-customerName-error" : undefined}
            />
          </Field>

          <div className={styles.row}>
            <Field label="Phone number" required error={errors.phone} htmlFor="po-phone">
              <input
                id="po-phone"
                name="phone"
                type="tel"
                className={`${styles.input} ${errors.phone ? styles.invalid : ""}`}
                value={values.phone}
                onChange={setValue("phone")}
                placeholder="+91 98765 43210"
                maxLength={30}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "po-phone-error" : undefined}
              />
            </Field>
            <Field label="Email address" required error={errors.email} htmlFor="po-email">
              <input
                id="po-email"
                name="email"
                type="email"
                className={`${styles.input} ${errors.email ? styles.invalid : ""}`}
                value={values.email}
                onChange={setValue("email")}
                readOnly={identityLocked}
                placeholder="procurement@customer.com"
                maxLength={254}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "po-email-error" : undefined}
              />
            </Field>
          </div>

          <Field label="Location" optional htmlFor="po-location">
            <input
              id="po-location"
              name="location"
              className={styles.input}
              value={values.location}
              onChange={setValue("location")}
              placeholder="Area or locality"
              maxLength={200}
            />
          </Field>

          <Field label="Address" required error={errors.address} htmlFor="po-address">
            <textarea
              id="po-address"
              name="address"
              rows={2}
              className={`${styles.input} ${styles.textarea} ${errors.address ? styles.invalid : ""}`}
              value={values.address}
              onChange={setValue("address")}
              placeholder="Street, city, state, PIN code"
              maxLength={500}
              aria-invalid={!!errors.address}
              aria-describedby={errors.address ? "po-address-error" : undefined}
            />
          </Field>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Order details</h2>
          <p className={styles.cardHint}>The service being requested and anything the team should know.</p>

          <div className={styles.row}>
            <Field label="Service type" required error={errors.serviceType} htmlFor="po-serviceType">
              <select
                id="po-serviceType"
                name="serviceType"
                className={`${styles.input} ${errors.serviceType ? styles.invalid : ""}`}
                value={newType !== null ? ADD_NEW : values.serviceType}
                onChange={chooseServiceType}
                aria-invalid={!!errors.serviceType}
                aria-describedby={errors.serviceType ? "po-serviceType-error" : undefined}
              >
                <option value="">Select service type…</option>
                {serviceTypes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value={ADD_NEW}>+ Add new type…</option>
              </select>
              {newType !== null && (
                <div className={styles.newType}>
                  <input
                    className={`${styles.input} ${newTypeError ? styles.invalid : ""}`}
                    value={newType}
                    onChange={(e) => {
                      setNewType(e.target.value);
                      setNewTypeError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveNewType();
                      }
                    }}
                    placeholder="New PO type name"
                    maxLength={60}
                    autoFocus
                    aria-label="New PO type name"
                    aria-invalid={!!newTypeError}
                  />
                  <button type="button" className={styles.btnAdd} onClick={saveNewType} disabled={savingType}>
                    {savingType ? "Saving…" : "Add"}
                  </button>
                  <button type="button" className={styles.btnSecondary} onClick={() => setNewType(null)} disabled={savingType}>
                    Cancel
                  </button>
                  {newTypeError && (
                    <div className={styles.fieldError} role="alert">
                      {newTypeError}
                    </div>
                  )}
                </div>
              )}
            </Field>
          </div>

          <Field label="PO instructions" optional error={errors.poInstructions} htmlFor="po-poInstructions">
            <textarea
              id="po-poInstructions"
              name="poInstructions"
              rows={4}
              className={`${styles.input} ${styles.textarea}`}
              value={values.poInstructions}
              onChange={setValue("poInstructions")}
              placeholder="Special handling notes, site access instructions, etc."
              maxLength={5000}
            />
          </Field>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            Attachments <span className={styles.opt}>(optional)</span>
          </h2>
          <p className={styles.cardHint}>Upload the purchase order received from the customer and any supporting documents.</p>

          {isEdit && po.documents.length > 0 && (
            <ul className={styles.existing}>
              {po.documents.map((d) => {
                const removed = removedIds.includes(d.id);
                return (
                  <li key={d.id} className={styles.existingItem}>
                    <a
                      href={`/purchase-orders/${po.id}/documents/${d.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className={removed ? styles.struck : undefined}
                    >
                      {d.name}
                    </a>
                    <span className={styles.size}>{formatBytes(d.size)}</span>
                    <button type="button" className={styles.linkBtn} onClick={() => toggleRemoveExisting(d.id)}>
                      {removed ? "Undo" : "Remove"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <input
            ref={fileInput}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf"
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div
            className={`${styles.drop} ${dragging ? styles.dragging : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => fileInput.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInput.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
          >
            <span className={styles.dropIcon}>
              <Icon name="upload" size={24} />
            </span>
            <div className={styles.dropTitle}>Drag files here, or click to browse</div>
            <div className={styles.dropHint}>PDF, JPG, PNG up to {formatBytes(MAX_FILE_BYTES)} each</div>
          </div>

          {fileProblems.length > 0 && (
            <ul className={styles.problems} role="alert">
              {fileProblems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}

          {files.length > 0 && (
            <div className={styles.thumbs}>
              {files.map((f) => (
                <div key={f.id} className={styles.thumb}>
                  <div className={styles.thumbBox}>
                    {f.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.previewUrl} alt="" />
                    ) : (
                      <span className={styles.ext}>{f.file.name.split(".").pop().toUpperCase()}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.thumbRemove}
                    onClick={() => removeFile(f.id)}
                    aria-label={`Remove ${f.file.name}`}
                  >
                    ×
                  </button>
                  <div className={styles.thumbName} title={f.file.name}>
                    {f.file.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className={styles.summary}>
        <div className={styles.card}>
          <h2 className={styles.summaryTitle}>PO summary</h2>

          <div className={styles.summaryLabel}>PO number</div>
          <div className={styles.poNumber} title="Assigned automatically when the PO is saved">
            <span>{isEdit ? po.poNumber : "PO-XXXX"}</span>
            <LockIcon />
          </div>
          {isEdit ? (
            <StatusPill status={po.status} />
          ) : (
            <span className={styles.tbc}>Format TBC · assigned on save</span>
          )}

          <hr className={styles.rule} />

          <div className={styles.kv}>
            <span>Customer</span>
            <strong>{values.customerName.trim() || "—"}</strong>
          </div>
          <div className={styles.kv}>
            <span>Service type</span>
            <strong>{values.serviceType || "—"}</strong>
          </div>
          <div className={styles.kv}>
            <span>Files attached</span>
            <strong>{attachedCount}</strong>
          </div>

          <button type="submit" className={styles.submit} disabled={pending}>
            {pending ? "Saving…" : isEdit ? "Save changes" : "Save & create PO"}
          </button>
          <Link href={cancelHref} className={styles.cancel}>
            Cancel
          </Link>
        </div>
      </aside>
    </form>
  );
}
