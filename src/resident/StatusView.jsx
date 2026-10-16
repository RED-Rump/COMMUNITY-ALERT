import { useMemo } from "react";
import { collection, query, where } from "firebase/firestore";
import { Check, Clock3, Droplets, Radio, Zap } from "lucide-react";
import { db, firebaseError } from "../firebase";
import { useCollection } from "../shared/firestoreHooks";
import SeverityBadge from "../shared/SeverityBadge";

function formatDate(value) {
  if (!value?.toDate) return "Time to be confirmed";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(value.toDate());
}

export default function StatusView({ zone }) {
  const outageQuery = useMemo(
    () => db && zone ? query(collection(db, "outages"), where("zoneId", "==", zone.id)) : null,
    [zone?.id],
  );
  const { documents, loading, error } = useCollection(outageQuery, [outageQuery]);
  const sorted = [...documents].sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  const outage = sorted.find((item) => item.status === "active")
    ?? sorted.find((item) => item.status === "resolved");
  const isResolved = outage?.status === "resolved";

  if (firebaseError) return <div className="resident-state setup-state"><Radio size={22} /><h2>Getting your community connected</h2><p>{firebaseError}</p><p>Once Firebase is configured and neighborhoods are added, local updates will appear here.</p></div>;
  if (error) return <div className="resident-state error-state"><h2>Updates unavailable</h2><p>We couldn’t load local outage information: {error}</p></div>;
  if (loading) return <div className="resident-state"><span className="loading-dot" /><p>Checking for local updates…</p></div>;
  if (!outage) return <div className="resident-state calm-state"><div className="calm-icon"><Check size={24} /></div><p className="eyebrow">ALL CLEAR</p><h2>No active outages</h2><p>There are no reported water or power interruptions in {zone?.name ?? "your area"}.</p><span className="refresh-note"><Radio size={14} /> This page updates automatically</span></div>;

  return (
    <article className={`resident-alert ${isResolved ? "resolved-alert" : ""}`}>
      <div className="alert-topline"><SeverityBadge severity={isResolved ? "resolved" : outage.severity} /><span className="live-indicator"><i /> Live update</span></div>
      <div className={`utility-illustration ${outage.utilityType}`} aria-hidden="true">{outage.utilityType === "water" ? <Droplets size={24} /> : <Zap size={24} />}</div>
      <p className="eyebrow">{outage.utilityType === "water" ? "WATER SERVICE" : "POWER SERVICE"} · {isResolved ? "RESTORED" : "SERVICE UPDATE"}</p>
      <h2>{isResolved ? "Service is back on" : `${outage.utilityType === "water" ? "Water" : "Power"} ${outage.severity === "scheduled" ? "work is planned" : "interruption reported"}`}</h2>
      {outage.cause && !outage.messageIncludesCause && <p className="cause-text">{outage.cause}</p>}
      <p className="alert-message">{outage.message}</p>
      {!isResolved && outage.estimatedRestoration && <div className="restoration-time"><Clock3 size={17} /><span><small>ESTIMATED RESTORATION</small><strong>{formatDate(outage.estimatedRestoration)}</strong></span></div>}
      {isResolved && outage.resolvedAt && <p className="resolved-time">Resolved {formatDate(outage.resolvedAt)}</p>}
      <div className="alert-bottom"><Radio size={15} /> Live updates for {zone?.name}</div>
    </article>
  );
}
