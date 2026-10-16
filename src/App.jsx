import { useEffect, useMemo, useState } from "react";
import { collection, query } from "firebase/firestore";
import { signOut as firebaseSignOut } from "firebase/auth";
import { ArrowUpRight, Bell, Droplets, Shield, Zap } from "lucide-react";
import ProtectedRoute from "./admin/ProtectedRoute";
import AdminShell from "./admin/AdminShell";
import { AlertHistoryView, ZonesView } from "./admin/AdminDataViews";
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
  const [activeSection, setActiveSection] = useState("create");
  const [browserOnline, setBrowserOnline] = useState(navigator.onLine);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    function updateOnlineStatus() {
      setBrowserOnline(navigator.onLine);
    }
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  async function signOut() {
    setSignOutError("");
    try {
      await firebaseSignOut(auth);
    } catch (signOutFailure) {
      setSignOutError(`Could not sign out: ${signOutFailure.message}`);
    }
  }

  return (
    <AdminShell
      user={user}
      activeSection={activeSection}
      onNavigate={setActiveSection}
      online={browserOnline && !loading && !error && !firebaseError}
      onSignOut={signOut}
    >
      {firebaseError && <p className="notice notice-warning">{firebaseError}</p>}
      {signOutError && <p className="notice notice-error" role="alert">{signOutError}</p>}
      {error && <p className="notice notice-error" role="alert">Could not load neighborhoods: {error}</p>}
      {!loading && zones.length === 0 && !error && !firebaseError && <p className="notice notice-warning">No neighborhoods yet. Add zone documents in Firestore with a <code>name</code> field before publishing.</p>}
      {activeSection === "create" && <AlertComposer zones={zones} user={user} />}
      {activeSection === "active" && (
        <>
          <div className="admin-content-heading"><div><p className="eyebrow">COMMUNITY OPERATIONS</p><h1>Active outages</h1><p>Monitor current service updates and resolve them when service returns.</p></div></div>
          <ActiveOutagesList zones={zones} />
        </>
      )}
      {activeSection === "zones" && <ZonesView zones={zones} loading={loading} />}
      {activeSection === "history" && <AlertHistoryView zones={zones} />}
    </AdminShell>
  );
}

export default function App() {
  return window.location.pathname.startsWith("/admin")
    ? <ProtectedRoute>{(user) => <AdminDashboard user={user} />}</ProtectedRoute>
    : <ResidentApp />;
}
