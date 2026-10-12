import { useState } from "react";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { Send } from "lucide-react";
import { db } from "../firebase";

const initialState = {
  zoneId: "",
  utilityType: "water",
  severity: "scheduled",
  cause: "",
  message: "",
  messageVariant: "detailed",
  estimatedRestoration: "",
};

export default function AlertComposer({ zones, user }) {
  const [form, setForm] = useState(initialState);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice(null);
    setSaving(true);
    try {
      const estimatedRestoration = form.estimatedRestoration
        ? Timestamp.fromDate(new Date(form.estimatedRestoration))
        : null;
      await addDoc(collection(db, "outages"), {
        ...form,
        cause: form.cause.trim() || null,
        estimatedRestoration,
        status: "active",
        createdAt: serverTimestamp(),
        resolvedAt: null,
        createdBy: user.uid,
      });
      setForm(initialState);
      setNotice({ type: "success", text: "Update published to the selected area." });
    } catch (error) {
      setNotice({ type: "error", text: `Could not publish the update: ${error.message}` });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel composer-panel">
      <div className="panel-heading">
        <div><p className="eyebrow">NEW UPDATE</p><h2>Share an outage update</h2></div>
        <span className="heading-icon"><Send size={18} /></span>
      </div>
      {notice && <p className={`notice notice-${notice.type}`} role="status">{notice.text}</p>}
      <form className="form-stack" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>Neighborhood
            <select required value={form.zoneId} onChange={(event) => update("zoneId", event.target.value)}>
              <option value="">Choose a neighborhood</option>
              {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
            </select>
          </label>
          <label>Utility
            <select value={form.utilityType} onChange={(event) => update("utilityType", event.target.value)}>
              <option value="water">Water</option><option value="power">Power</option>
            </select>
          </label>
          <label>Update type
            <select value={form.severity} onChange={(event) => update("severity", event.target.value)}>
              <option value="scheduled">Scheduled work</option><option value="emergency">Emergency</option>
            </select>
          </label>
          <label>Estimated restoration <span className="optional-label">Optional</span>
            <input type="datetime-local" value={form.estimatedRestoration} onChange={(event) => update("estimatedRestoration", event.target.value)} />
          </label>
        </div>
        <label>Cause <span className="optional-label">Optional</span>
          <input maxLength="120" placeholder="e.g. Repairs to a water main" value={form.cause} onChange={(event) => update("cause", event.target.value)} />
        </label>
        <label>Message for residents
          <textarea required minLength="3" maxLength="500" rows="4" placeholder="Share what residents need to know…" value={form.message} onChange={(event) => update("message", event.target.value)} />
        </label>
        <div className="variant-row">
          <div><strong>Message style</strong><span className="field-help">Choose the wording shown to residents.</span></div>
          <div className="segmented-control" role="group" aria-label="Message style">
            {["terse", "detailed"].map((variant) => <button key={variant} type="button" className={form.messageVariant === variant ? "selected" : ""} onClick={() => update("messageVariant", variant)}>{variant === "terse" ? "Terse" : "Detailed"}</button>)}
          </div>
        </div>
        <button className="button button-primary" disabled={saving || zones.length === 0 || !db} type="submit">
          <Send size={16} /> {saving ? "Publishing…" : "Publish update"}
        </button>
      </form>
    </section>
  );
}
