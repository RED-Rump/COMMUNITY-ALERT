import { useMemo, useState } from "react";
import { collection, query } from "firebase/firestore";
import { CalendarDays, Search } from "lucide-react";
import { db } from "../firebase";
import { useCollection } from "../shared/firestoreHooks";
import SeverityBadge from "../shared/SeverityBadge";

function formatDate(value) {
  if (!value?.toDate) return "Time unavailable";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(value.toDate());
}

export function ZonesView({ zones, loading }) {
  const [search, setSearch] = useState("");
  const filtered = zones.filter((zone) => zone.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <>
      <div className="admin-content-heading"><div><p className="eyebrow">COMMUNITY OPERATIONS</p><h1>Zones</h1><p>View the neighborhoods currently receiving CommunityAlert updates.</p></div></div>
      <section className="admin-data-card">
        <div className="data-card-heading"><div><h2>Community zones</h2><p>{zones.length} {zones.length === 1 ? "zone" : "zones"} available</p></div><label className="search-field"><Search size={16} /><span className="sr-only">Search zones</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search zones" /></label></div>
        {filtered.length ? <ul className="zone-list">{filtered.map((zone) => <li key={zone.id}><span className="zone-list-icon">{zone.name.slice(0, 1).toUpperCase()}</span><span><strong>{zone.name}</strong><small>Resident updates enabled</small></span></li>)}</ul> : <p className="empty-data">{loading ? "Loading community zones…" : zones.length ? "No zones match your search." : "No zones have been configured yet."}</p>}
      </section>
    </>
  );
}

export function AlertHistoryView({ zones }) {
  const outagesQuery = useMemo(() => db ? query(collection(db, "outages")) : null, []);
  const { documents, loading, error } = useCollection(outagesQuery, [outagesQuery]);
  const zoneNames = useMemo(() => new Map(zones.map((zone) => [zone.id, zone.name])), [zones]);
  const history = documents
    .filter((outage) => outage.status === "resolved")
    .sort((a, b) => (b.resolvedAt?.seconds ?? b.createdAt?.seconds ?? 0) - (a.resolvedAt?.seconds ?? a.createdAt?.seconds ?? 0));

  return (
    <>
      <div className="admin-content-heading"><div><p className="eyebrow">COMMUNITY OPERATIONS</p><h1>Alert history</h1><p>Resolved service updates for your community zones.</p></div></div>
      <section className="admin-data-card">
        <div className="data-card-heading"><div><h2>Resolved updates</h2><p>Most recently resolved alerts appear first.</p></div></div>
        {error && <p className="notice notice-error" role="alert">Could not load alert history: {error}</p>}
        {loading ? <p className="empty-data">Loading alert history…</p> : history.length ? (
          <div className="history-list">{history.map((outage) => (
            <article className="history-row" key={outage.id}>
              <div className="history-row-main"><SeverityBadge severity="resolved" /><h3>{zoneNames.get(outage.zoneId) ?? "Unknown zone"}</h3><p>{outage.utilityType === "water" ? "Water" : "Power"} · {outage.message}</p></div>
              <span className="history-date"><CalendarDays size={14} />{formatDate(outage.resolvedAt ?? outage.createdAt)}</span>
            </article>
          ))}</div>
        ) : <p className="empty-data">No resolved alerts to show yet.</p>}
      </section>
    </>
  );
}
