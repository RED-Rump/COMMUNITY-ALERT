import { useMemo, useState } from "react";
import { collection, query } from "firebase/firestore";
import { signOut as firebaseSignOut } from "firebase/auth";
import { ArrowUpRight, Bell, Droplets, Shield, Zap } from "lucide-react";
import ProtectedRoute from "./admin/ProtectedRoute";
import AlertComposer from "./admin/AlertComposer";
import ActiveOutagesList from "./admin/ActiveOutagesList";
import ZoneSelector from "./resident/ZoneSelector";
import StatusView from "./resident/StatusView";
import { auth, db, firebaseError } from "./firebase";
import { useCollection } from "./shared/firestoreHooks";

function Brand({ admin = false }) {
  return <a className="brand" href={admin ? "/admin" : "/"} aria-label="CommunityAlert home"><span className="brand-mark"><Bell size={18} /></span><span>community<span className="brand-heavy">alert</span></span></a>;
}

function ResidentApp() {
  const zonesQuery = useMemo(() => db ? query(collection(db, "zones")) : null, []);
  const { documents: zones, loading, error } = useCollection(zonesQuery, [zonesQuery]);
  const [selectedId, setSelectedId] = useState("");
  const selectedZone = zones.find((zone) => zone.id === selectedId) ?? zones[0] ?? null;

  return (
    <div className="resident-page">
      <header className="topbar"><Brand /><a className="admin-link" href="/admin">Admin <ArrowUpRight size={14} /></a></header>
      <main className="resident-main">
        <section className="resident-intro">
          <span className="intro-kicker"><span className="kicker-dot" /> YOUR COMMUNITY, IN THE KNOW</span>
          <h1>Reliable updates.<br /><span>Right where you live.</span></h1>
          <p>Clear, timely information about water and power interruptions in your neighborhood.</p>
        </section>
        <div className="resident-content">
          <div className="neighborhood-card">
            <div className="neighborhood-icon"><Droplets size={19} /><Zap size={17} /></div>
            <div className="neighborhood-copy"><strong>Find your area</strong><span>Choose a neighborhood to see its latest status.</span></div>
            <ZoneSelector zones={zones} selectedZone={selectedZone?.id ?? ""} onSelect={setSelectedId} />
          </div>
          {error ? <div className="notice notice-error">Could not load neighborhoods: {error}</div> : loading ? <div className="center-state">Loading neighborhoods…</div> : zones.length === 0 && !firebaseError ? <div className="resident-state"><h2>No neighborhoods set up yet</h2><p>An admin can add neighborhoods to the <code>zones</code> collection in Firestore.</p></div> : <StatusView zone={selectedZone} />}
          <div className="trust-note"><Shield size={16} /><span>Updates are shared by your local community administrators.</span></div>
        </div>
      </main>
      <footer className="site-footer"><Brand /><span>Neighbors looking out for neighbors.</span><span>© {new Date().getFullYear()} CommunityAlert</span></footer>
    </div>
  );
}

function AdminDashboard({ user }) {
  const zonesQuery = useMemo(() => db ? query(collection(db, "zones")) : null, []);
  const { documents: zones, loading, error } = useCollection(zonesQuery, [zonesQuery]);

  async function signOut() {
    await firebaseSignOut(auth);
  }

  return (
    <div className="admin-page">
      <header className="topbar admin-topbar"><Brand admin /><a className="admin-link" href="/">Resident view <ArrowUpRight size={14} /></a><button className="signout-button" type="button" onClick={signOut}>Sign out</button></header>
      <main className="admin-main">
        <div className="admin-welcome"><div><p className="eyebrow">COMMUNITY OPERATIONS</p><h1>Good morning.</h1><p>Keep your neighbors informed with clear, timely updates.</p></div><div className="admin-avatar">{user.email?.slice(0, 1).toUpperCase() ?? "A"}</div></div>
        {firebaseError && <p className="notice notice-warning">{firebaseError}</p>}
        {error && <p className="notice notice-error">Could not load neighborhoods: {error}</p>}
        {!loading && zones.length === 0 && !error && <p className="notice notice-warning">No neighborhoods yet. Add zone documents in Firestore with a <code>name</code> field before posting an update.</p>}
        <div className="admin-grid"><AlertComposer zones={zones} user={user} /><ActiveOutagesList zones={zones} /></div>
        <p className="admin-account">Signed in as {user.email}</p>
      </main>
    </div>
  );
}

export default function App() {
  return window.location.pathname.startsWith("/admin")
    ? <ProtectedRoute>{(user) => <AdminDashboard user={user} />}</ProtectedRoute>
    : <ResidentApp />;
}
