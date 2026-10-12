import { useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { Check, Clock3, Droplets, Zap } from "lucide-react";
import { db } from "../firebase";
import { useCollection } from "../shared/firestoreHooks";
import SeverityBadge from "../shared/SeverityBadge";

function formatDate(value) {
  if (!value?.toDate) return "Just now";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(value.toDate());
}

export default function ActiveOutagesList({ zones }) {
  const [resolveError, setResolveError] = useState("");
  const outagesQuery = useMemo(() => db ? query(collection(db, "outages"), where("status", "==", "active")) : null, []);
  const { documents: outages, loading, error } = useCollection(outagesQuery, [outagesQuery]);
  const zoneNames = useMemo(() => new Map(zones.map((zone) => [zone.id, zone.name])), [zones]);

  async function markResolved(id) {
    setResolveError("");
    try {
      await updateDoc(doc(db, "outages", id), { status: "resolved", severity: "resolved", resolvedAt: serverTimestamp() });
    } catch (updateError) {
      setResolveError(`Could not resolve this update: ${updateError.message}`);
    }
  }

  const sorted = [...outages].sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));

  return (
    <section className="panel outages-panel">
      <div className="panel-heading">
        <div><p className="eyebrow">LIVE MONITOR</p><h2>Active updates <span className="count-pill">{outages.length}</span></h2></div>
        <span className="live-indicator"><i /> Live</span>
      </div>
      {error && <p className="notice notice-error" role="alert">Could not load updates: {error}</p>}
      {resolveError && <p className="notice notice-error" role="alert">{resolveError}</p>}
      {loading ? <p className="empty-inline">Loading updates…</p> : sorted.length === 0 ? (
        <div className="empty-inline"><span className="empty-check"><Check size={17} /></span><span><strong>All quiet for now</strong><br />Active outage updates will appear here.</span></div>
      ) : (
        <div className="outage-list">
          {sorted.map((outage) => (
            <article className="admin-outage" key={outage.id}>
              <div className="outage-topline">
                <span className="utility-label">{outage.utilityType === "water" ? <Droplets size={15} /> : <Zap size={15} />}{outage.utilityType}</span>
                <SeverityBadge severity={outage.severity} />
              </div>
              <h3>{zoneNames.get(outage.zoneId) ?? "Unknown neighborhood"}</h3>
              {outage.cause && <p className="cause-text">{outage.cause}</p>}
              <p className="outage-message">{outage.message}</p>
              {outage.estimatedRestoration && <p className="meta-line"><Clock3 size={14} /> Expected back {formatDate(outage.estimatedRestoration)}</p>}
              <div className="outage-footer"><span>Posted {formatDate(outage.createdAt)}</span><button className="button button-subtle" type="button" onClick={() => markResolved(outage.id)}><Check size={15} /> Mark resolved</button></div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
