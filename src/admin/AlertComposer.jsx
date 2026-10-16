import { useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, serverTimestamp, Timestamp, writeBatch } from "firebase/firestore";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Droplets,
  Info,
  LoaderCircle,
  Radio,
  Send,
  Smartphone,
  X,
  Zap,
} from "lucide-react";
import { db } from "../firebase";

const MAX_MESSAGE_LENGTH = 240;
const DRAFT_KEY_PREFIX = "community-alert-draft";

function createInitialState() {
  return {
    zoneIds: [],
    utilityType: "power",
    severity: "emergency",
    cause: "",
    message: "",
    messageVariant: "detailed",
    restorationDate: "",
    restorationTime: "",
  };
}

function getTodayInNairobi() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getRestorationDate(date, time) {
  if (!date || !time) return null;
  return new Date(`${date}T${time}:00+03:00`);
}

function formatRestoration(date, time) {
  const restorationDate = getRestorationDate(date, time);
  if (!restorationDate || Number.isNaN(restorationDate.getTime())) return "";
  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
  }).format(restorationDate);
  const today = getTodayInNairobi() === date;
  const formattedTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h12",
  }).format(restorationDate);
  return `${today ? "Today" : day} by ${formattedTime}`;
}

function buildResidentMessage({ utilityType, severity, cause = "", message, variant }) {
  const utility = utilityType === "water" ? "Water service" : "Power service";
  const trimmedMessage = message.trim().replace(/\s+/g, " ");
  const trimmedCause = cause.trim().replace(/\s+/g, " ");
  const causeText = trimmedCause ? `Cause: ${trimmedCause}.` : "";
  if (severity === "resolved") {
    const restored = utilityType === "water"
      ? variant === "terse" ? "Water service is back on." : "Water service has been restored."
      : variant === "terse" ? "Power service is back on." : "Power service has been restored.";
    return [restored, causeText, trimmedMessage].filter(Boolean).join(" ");
  }
  const summary = severity === "scheduled" ? "Scheduled maintenance" : "An interruption";
  const intro = variant === "terse"
    ? `${utility}: ${summary.toLowerCase()}.`
    : `${utility}: ${summary.toLowerCase()} is ${severity === "scheduled" ? "planned" : "affecting your area"}.`;
  return [intro, causeText, trimmedMessage].filter(Boolean).join(" ");
}

function useSavedDraft(userId) {
  const storageKey = `${DRAFT_KEY_PREFIX}:${userId}`;
  const [storageReadResult] = useState(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      return { draft: saved ? { ...createInitialState(), ...JSON.parse(saved) } : createInitialState(), error: "" };
    } catch (error) {
      console.error("Could not load the saved alert draft.", error);
      return { draft: createInitialState(), error: "Could not load the saved draft. It may be damaged or inaccessible." };
    }
  });
  const skipNextSave = useRef(Boolean(storageReadResult.error));
  const [draft, setDraft] = useState(storageReadResult.draft);
  const [draftStatus, setDraftStatus] = useState(storageReadResult.error ? "error" : "saved");
  const [storageError, setStorageError] = useState(storageReadResult.error);
  const latestDraft = useRef(draft);

  useEffect(() => {
    latestDraft.current = draft;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return undefined;
    }
    setDraftStatus("saving");
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(draft));
        setDraftStatus("saved");
        setStorageError("");
      } catch (error) {
        console.error("Could not save the alert draft.", error);
        setDraftStatus("error");
        setStorageError("This draft could not be saved on this device.");
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [draft, storageKey]);

  function saveDraft(snapshot = latestDraft.current) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
      setDraftStatus("saved");
      setStorageError("");
    } catch (error) {
      console.error("Could not save the alert draft.", error);
      setDraftStatus("error");
      setStorageError("This draft could not be saved on this device.");
    }
  }

  function clearDraft() {
    try {
      window.localStorage.removeItem(storageKey);
      skipNextSave.current = true;
      setDraft(createInitialState());
      setDraftStatus("saved");
      setStorageError("");
    } catch (error) {
      console.error("Could not clear the saved alert draft.", error);
      setDraftStatus("error");
      setStorageError("The published draft could not be cleared from this device.");
    }
  }

  return { draft, setDraft, draftStatus, storageError, saveDraft, clearDraft };
}

function FieldLabel({ children, detail, htmlFor }) {
  const Tag = htmlFor ? "label" : "div";
  return <Tag className="admin-field-label" htmlFor={htmlFor}><span>{children}</span><span>{detail}</span></Tag>;
}

function ZonePicker({ zones, selectedIds, onChange, onBlur, error }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const pickerRef = useRef(null);
  const options = zones.filter((zone) =>
    !selectedIds.includes(zone.id) && zone.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!pickerRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  function selectZone(zone) {
    onChange([...selectedIds, zone.id]);
    setSearch("");
    setOpen(true);
  }

  function removeZone(id) {
    onChange(selectedIds.filter((selectedId) => selectedId !== id));
  }

  function onKeyDown(event) {
    if (event.key === "Backspace" && !search && selectedIds.length) {
      removeZone(selectedIds[selectedIds.length - 1]);
      return;
    }
    if (event.key === "ArrowDown" && options.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % options.length);
    } else if (event.key === "ArrowUp" && options.length) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + options.length) % options.length);
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      if (options[activeIndex]) selectZone(options[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="admin-field">
      <FieldLabel htmlFor="zone-search" detail={`${selectedIds.length} selected`}>Zones <span className="required-label">Required</span></FieldLabel>
      <div ref={pickerRef} className={`zone-picker ${open ? "is-open" : ""} ${error ? "has-error" : ""}`} onClick={() => inputRef.current?.focus()}>
        <div className="zone-chips">
          {selectedIds.map((id) => {
            const zone = zones.find((item) => item.id === id);
            if (!zone) return null;
            return (
              <span className="zone-chip" key={id}>
                {zone.name}
                <button type="button" aria-label={`Remove ${zone.name}`} onClick={(event) => { event.stopPropagation(); removeZone(id); }}>
                  <X size={13} />
                </button>
              </span>
            );
          })}
          <input
            ref={inputRef}
            id="zone-search"
            role="combobox"
            aria-label="Add a zone"
            aria-expanded={open}
            aria-controls="zone-options"
            aria-activedescendant={open && options[activeIndex] ? `zone-option-${options[activeIndex].id}` : undefined}
            aria-autocomplete="list"
            aria-required="true"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "zones-error" : undefined}
            placeholder="Add zone…"
            value={search}
            onFocus={() => setOpen(true)}
            onChange={(event) => { setSearch(event.target.value); setOpen(true); setActiveIndex(0); }}
            onKeyDown={onKeyDown}
            onBlur={() => {
              onBlur?.();
              window.setTimeout(() => {
                if (!pickerRef.current?.contains(document.activeElement)) setOpen(false);
              }, 0);
            }}
          />
        </div>
        <ChevronDown size={17} aria-hidden="true" />
        {open && (
          <ul className="zone-options" id="zone-options" role="listbox" aria-label="Available zones">
            {options.length ? options.map((zone, index) => (
              <li
                id={`zone-option-${zone.id}`}
                key={zone.id}
                role="option"
                aria-selected={index === activeIndex}
                className={index === activeIndex ? "active-option" : ""}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectZone(zone)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {zone.name}
              </li>
            )) : <li className="zone-options-empty">No matching zones</li>}
          </ul>
        )}
      </div>
      {error && <p className="field-error" id="zones-error" role="alert"><AlertTriangle size={14} /> Select at least one zone.</p>}
      <span className="sr-only">Use the arrow keys and Enter to add a zone. Press Backspace to remove the last selected zone.</span>
    </div>
  );
}

function ChoiceCard({ name, value, selected, onSelect, icon: Icon, caption, tone }) {
  return (
    <button
      className={`choice-card ${tone ? `choice-${tone}` : ""} ${selected ? "is-selected" : ""}`}
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(value)}
    >
      <span className="choice-icon"><Icon size={17} /></span>
      <span className="choice-copy"><strong>{name}</strong>{caption && <small>{caption}</small>}</span>
      {selected && <CheckCircle2 className="choice-check" size={18} />}
    </button>
  );
}

function ResidentPreview({ form, zones }) {
  const selectedZones = zones.filter((zone) => form.zoneIds.includes(zone.id));
  const residentMessage = useMemo(() => buildResidentMessage(form), [form]);
  const utilityName = form.utilityType === "water" ? "Water" : "Power";
  const title = form.severity === "resolved"
    ? `${utilityName} service is back on`
    : form.severity === "scheduled"
      ? `${utilityName} work is planned`
      : `${utilityName} is currently off`;
  const severityLabel = form.severity.toUpperCase();
  const SeverityIcon = form.severity === "emergency"
    ? AlertTriangle
    : form.severity === "scheduled" ? CalendarDays : CheckCircle2;
  const restoration = formatRestoration(form.restorationDate, form.restorationTime);
  const zoneLabel = selectedZones.length > 1 ? `${selectedZones[0].name} +${selectedZones.length - 1}` : selectedZones[0]?.name ?? "Your zone";
  return (
    <aside className="resident-preview" aria-live="polite">
      <div className="preview-heading">
        <div><h2>Resident preview</h2><p>App notification · {form.messageVariant === "terse" ? "Terse" : "Detailed"}</p></div>
        <Smartphone size={20} />
      </div>
      <div className="phone-mock">
        <div className="phone-top"><span className="phone-brand"><span className="phone-mark"><Radio size={13} /></span>CommunityAlert</span><span className="phone-zone">{zoneLabel}</span></div>
        <div className="phone-alert">
          <span className={`preview-severity severity-${form.severity}`}><SeverityIcon size={11} aria-hidden="true" />{severityLabel}</span>
          <h3>{title}</h3>
          <p className={form.message || form.cause.trim() ? "" : "preview-placeholder"}>{form.message || form.cause.trim() ? residentMessage : "Your clear, resident-facing message will appear here."}</p>
          {form.severity !== "resolved" && (
            <div className="preview-restoration">
              <Clock3 size={15} />
              <span><small>Estimated restoration</small><strong>{restoration || "Add date and time"}</strong></span>
            </div>
          )}
        </div>
      </div>
      <div className="delivery-summary">
        <strong>Delivery summary</strong>
        <p><span>Push notification</span><span className="delivery-unavailable">Not connected</span></p>
        <p><span>Resident status</span><span><Check size={13} /> Ready</span></p>
      </div>
    </aside>
  );
}

function ReviewDialog({ form, zones, onCancel, onConfirm, publishing }) {
  const chosenZones = zones.filter((zone) => form.zoneIds.includes(zone.id)).map((zone) => zone.name);
  const message = buildResidentMessage(form);
  const restoration = formatRestoration(form.restorationDate, form.restorationTime);
  const dialogRef = useRef(null);
  const publishingRef = useRef(publishing);

  useEffect(() => {
    publishingRef.current = publishing;
  }, [publishing]);

  useEffect(() => {
    dialogRef.current?.querySelector("button:not(:disabled)")?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape" && !publishingRef.current) {
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll("button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
      if (!focusable?.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !publishing) onCancel(); }}>
      <section ref={dialogRef} className="review-dialog" role="dialog" aria-modal="true" aria-labelledby="review-title" aria-busy={publishing}>
        <div className="review-dialog-heading"><div><p className="eyebrow">FINAL CHECK</p><h2 id="review-title">Review before publishing</h2></div><button type="button" aria-label="Close review" onClick={onCancel} disabled={publishing}><X size={19} /></button></div>
        <dl>
          <div><dt>Zones</dt><dd>{chosenZones.join(", ")}</dd></div>
          <div><dt>Utility and severity</dt><dd>{form.utilityType === "water" ? "Water" : "Power"} · {form.severity}</dd></div>
          <div><dt>Resident message</dt><dd>{message}</dd></div>
          {restoration && <div><dt>Estimated restoration</dt><dd>{restoration} (Africa/Nairobi)</dd></div>}
        </dl>
        <div className="review-actions">
          <button className="admin-button admin-button-secondary" type="button" onClick={onCancel} disabled={publishing}>Go back</button>
          <button className="admin-button admin-button-primary" type="button" onClick={onConfirm} disabled={publishing}>
            {publishing ? <LoaderCircle size={16} className="spin" /> : <Send size={16} />}
            {publishing ? "Publishing…" : "Confirm and publish"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function AlertComposer({ zones, user }) {
  const { draft, setDraft, draftStatus, storageError, saveDraft, clearDraft } = useSavedDraft(user.uid);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [triedReview, setTriedReview] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState(null);
  const messageRef = useRef(null);

  useEffect(() => {
    if (!messageRef.current) return;
    messageRef.current.style.height = "auto";
    messageRef.current.style.height = `${messageRef.current.scrollHeight}px`;
  }, [draft.message]);

  function getValidation(current) {
    const residentMessage = buildResidentMessage(current);
    return {
      zones: current.zoneIds.length === 0,
      message: current.message.trim().length < 3 || residentMessage.length > MAX_MESSAGE_LENGTH,
      restoration: current.severity !== "resolved" && (
        !current.restorationDate || !current.restorationTime
        || getRestorationDate(current.restorationDate, current.restorationTime) <= new Date()
      ),
    };
  }

  function update(field, value) {
    const current = { ...draft, [field]: value };
    setDraft(current);
    setNotice(null);
    const relatedField = field === "zoneIds"
      ? "zones"
      : field === "restorationDate" || field === "restorationTime"
        ? "restoration"
        : field === "message" || field === "cause" ? "message" : null;
    if (triedReview) {
      validate(current);
    } else if (relatedField && touched[relatedField]) {
      const errors = getValidation(current);
      setFieldErrors((currentErrors) => ({ ...currentErrors, [relatedField]: errors[relatedField] }));
    }
  }

  function touch(field) {
    setTouched((current) => ({ ...current, [field]: true }));
    const errors = getValidation(draft);
    setFieldErrors((current) => ({ ...current, [field]: errors[field] }));
  }

  function validate(current = draft) {
    const errors = getValidation(current);
    setFieldErrors(errors);
    return !Object.values(errors).some(Boolean);
  }

  function requestReview(event) {
    event.preventDefault();
    setTriedReview(true);
    if (validate()) setReviewOpen(true);
  }

  async function publish() {
    setPublishing(true);
    setNotice(null);
    try {
      const batch = writeBatch(db);
      const outages = collection(db, "outages");
      const estimatedRestoration = draft.severity === "resolved"
        ? null
        : Timestamp.fromDate(getRestorationDate(draft.restorationDate, draft.restorationTime));
      const residentMessage = buildResidentMessage(draft);
      draft.zoneIds.forEach((zoneId) => {
        batch.set(doc(outages), {
          zoneId,
          utilityType: draft.utilityType,
          severity: draft.severity,
          cause: draft.cause.trim() || null,
          message: residentMessage,
          messageIncludesCause: Boolean(draft.cause.trim()),
          messageVariant: draft.messageVariant,
          status: draft.severity === "resolved" ? "resolved" : "active",
          estimatedRestoration,
          createdAt: serverTimestamp(),
          resolvedAt: draft.severity === "resolved" ? serverTimestamp() : null,
          createdBy: user.uid,
        });
      });
      await batch.commit();
      clearDraft();
      setTriedReview(false);
      setFieldErrors({});
      setTouched({});
      setReviewOpen(false);
      setNotice({ type: "success", text: `Update published to ${draft.zoneIds.length} ${draft.zoneIds.length === 1 ? "zone" : "zones"}.` });
    } catch (error) {
      console.error("Could not publish the alert.", error);
      setNotice({ type: "error", text: `Could not publish the update: ${error.message}` });
      setReviewOpen(false);
    } finally {
      setPublishing(false);
    }
  }

  const isValid = draft.zoneIds.length > 0
    && draft.message.trim().length >= 3
    && buildResidentMessage(draft).length <= MAX_MESSAGE_LENGTH
    && (draft.severity === "resolved" || (
      draft.restorationDate && draft.restorationTime
      && getRestorationDate(draft.restorationDate, draft.restorationTime) > new Date()
    ));
  const residentMessageLength = buildResidentMessage(draft).length;

  return (
    <>
      <div className="admin-content-heading">
        <div><p className="eyebrow">COMMUNITY OPERATIONS</p><h1>Create alert</h1><p>Publish a clear water or power update to selected zones.</p></div>
      </div>
      {notice && <p className={`notice notice-${notice.type}`} role={notice.type === "error" ? "alert" : "status"}>{notice.text}</p>}
      {storageError && <p className="notice notice-error" role="alert">{storageError}</p>}
      <div className="create-alert-grid">
        <section className="alert-details-card">
          <div className="details-heading">
            <div><h2>Alert details</h2><p>Fields marked required must be completed.</p></div>
            <span className={`draft-pill draft-${draftStatus}`} aria-live="polite">
              {draftStatus === "saving" ? <LoaderCircle className="spin" size={14} /> : draftStatus === "error" ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
              {draftStatus === "saving" ? "Saving…" : draftStatus === "error" ? "Not saved" : "Draft saved"}
            </span>
          </div>
          <form className="alert-form" onSubmit={requestReview} noValidate>
            <ZonePicker
              zones={zones}
              selectedIds={draft.zoneIds}
              onChange={(zoneIds) => update("zoneIds", zoneIds)}
              onBlur={() => touch("zones")}
              error={fieldErrors.zones}
            />
            <fieldset className="admin-fieldset">
              <legend><FieldLabel detail="Required">Utility type</FieldLabel></legend>
              <div className="choice-grid choice-grid-2" role="radiogroup" aria-label="Utility type">
                <ChoiceCard name="Power" value="power" icon={Zap} selected={draft.utilityType === "power"} onSelect={(value) => update("utilityType", value)} />
                <ChoiceCard name="Water" value="water" icon={Droplets} selected={draft.utilityType === "water"} onSelect={(value) => update("utilityType", value)} />
              </div>
            </fieldset>
            <fieldset className="admin-fieldset">
              <legend><FieldLabel detail="Required">Severity</FieldLabel></legend>
              <div className="choice-grid choice-grid-3" role="radiogroup" aria-label="Severity">
                <ChoiceCard name="Scheduled" caption="Planned work" value="scheduled" tone="scheduled" icon={CalendarDays} selected={draft.severity === "scheduled"} onSelect={(value) => update("severity", value)} />
                <ChoiceCard name="Emergency" caption={draft.severity === "emergency" ? "Selected" : "Urgent issue"} value="emergency" tone="emergency" icon={AlertTriangle} selected={draft.severity === "emergency"} onSelect={(value) => update("severity", value)} />
                <ChoiceCard name="Resolved" caption="Service back" value="resolved" tone="resolved" icon={CheckCircle2} selected={draft.severity === "resolved"} onSelect={(value) => update("severity", value)} />
              </div>
            </fieldset>
            <div className="admin-field">
              <div className="message-label-row">
                <FieldLabel
                  htmlFor="alert-message"
                  detail={<span className={residentMessageLength > MAX_MESSAGE_LENGTH ? "counter-error" : ""} aria-live={residentMessageLength > MAX_MESSAGE_LENGTH - 20 ? "polite" : "off"}>{residentMessageLength} / {MAX_MESSAGE_LENGTH}</span>}
                >
                  Message <span className="required-label">Required</span>
                </FieldLabel>
                <div className="segmented-control admin-segmented" role="group" aria-label="Message style">
                  {["terse", "detailed"].map((variant) => (
                    <button key={variant} type="button" className={draft.messageVariant === variant ? "selected" : ""} aria-pressed={draft.messageVariant === variant} onClick={() => update("messageVariant", variant)}>
                      {variant === "terse" ? "Terse" : "Detailed"}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                ref={messageRef}
                id="alert-message"
                className={`admin-textarea ${fieldErrors.message ? "has-error" : ""}`}
                rows="4"
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.message)}
                aria-describedby={fieldErrors.message ? "message-hint message-error" : "message-hint"}
                placeholder="Say what is affected, why (if known), and when service should return."
                value={draft.message}
                onBlur={() => touch("message")}
                onChange={(event) => update("message", event.target.value)}
              />
              <div className="message-meta"><span id="message-hint"><Info size={13} /> Plain language recommended</span></div>
              {fieldErrors.message && <p className="field-error" id="message-error" role="alert"><AlertTriangle size={14} /> Keep the resident-facing message between 3 and 240 characters, including its generated wording.</p>}
            </div>
            <div className="admin-field">
              <FieldLabel htmlFor="alert-cause" detail="Optional">Cause</FieldLabel>
              <input id="alert-cause" className="admin-input" type="text" maxLength="120" placeholder="For example, repairs to a water main" value={draft.cause} onChange={(event) => update("cause", event.target.value)} />
            </div>
            {draft.severity !== "resolved" && (
              <div className="admin-field">
                <FieldLabel detail="Required">Estimated restoration</FieldLabel>
                <div className="restoration-inputs">
                  <label className="icon-input"><CalendarDays size={16} /><span className="sr-only">Restoration date</span>
                    <input type="date" aria-required="true" aria-invalid={Boolean(fieldErrors.restoration)} aria-describedby={fieldErrors.restoration ? "restoration-error" : undefined} min={getTodayInNairobi()} value={draft.restorationDate} onBlur={() => touch("restoration")} onChange={(event) => update("restorationDate", event.target.value)} />
                  </label>
                  <label className="icon-input"><Clock3 size={16} /><span className="sr-only">Restoration time (Africa/Nairobi)</span>
                    <input type="time" aria-required="true" aria-invalid={Boolean(fieldErrors.restoration)} aria-describedby={fieldErrors.restoration ? "restoration-error" : undefined} value={draft.restorationTime} onBlur={() => touch("restoration")} onChange={(event) => update("restorationTime", event.target.value)} />
                  </label>
                </div>
                <p className="field-hint">Times use Africa/Nairobi. Choose a time in the future.</p>
                {fieldErrors.restoration && <p className="field-error" id="restoration-error" role="alert"><AlertTriangle size={14} /> Enter a future restoration date and time.</p>}
              </div>
            )}
            <div className="alert-actions">
              <button className="admin-button admin-button-secondary" type="button" onClick={() => { saveDraft(draft); setNotice(null); }}>
                <Check size={16} /> Save draft
              </button>
              <button className="admin-button admin-button-primary" type="submit" disabled={!isValid || publishing}>
                <Send size={16} /> Review and publish
              </button>
            </div>
          </form>
        </section>
        <ResidentPreview form={draft} zones={zones} />
      </div>
      {reviewOpen && <ReviewDialog form={draft} zones={zones} onCancel={() => setReviewOpen(false)} onConfirm={publish} publishing={publishing} />}
    </>
  );
}
