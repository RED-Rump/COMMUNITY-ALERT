import { useState } from "react";
import {
  Activity,
  Bell,
  ClipboardList,
  FileClock,
  LifeBuoy,
  LogOut,
  MapPinned,
  Menu,
  MoreHorizontal,
  PlusCircle,
  X,
} from "lucide-react";

const navigation = [
  { id: "active", label: "Active outages", icon: Activity },
  { id: "create", label: "Create alert", icon: PlusCircle },
  { id: "zones", label: "Zones", icon: MapPinned },
  { id: "history", label: "Alert history", icon: FileClock },
];

function Brand() {
  return (
    <a href="/admin" className="staff-brand" aria-label="CommunityAlert staff home">
      <span className="staff-brand-mark"><Bell size={17} /></span>
      <span>Community<span>Alert</span></span>
    </a>
  );
}

export default function AdminShell({ user, activeSection, onNavigate, online, onSignOut, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const staffName = user.displayName || user.email?.split("@")[0] || "Staff member";
  const initials = staffName.split(/[ ._-]/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");

  function navigate(section) {
    onNavigate(section);
    setMobileNavOpen(false);
  }

  return (
    <div className="staff-app">
      <aside className={`staff-sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-brand-row"><Brand /><button className="mobile-nav-close" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}><X size={19} /></button></div>
        <p className="sidebar-label">WORKSPACE</p>
        <nav className="staff-nav" aria-label="Staff workspace">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={`staff-nav-item ${activeSection === id ? "is-active" : ""}`} aria-current={activeSection === id ? "page" : undefined} onClick={() => navigate(id)}>
              <Icon size={18} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="publishing-help">
          <span className="help-icon"><LifeBuoy size={17} /></span>
          <strong>Publishing help</strong>
          <p>Keep messages direct. Update restoration times when conditions change.</p>
        </div>
        <div className="sidebar-user">
          <span className="staff-avatar">{initials || "S"}</span>
          <span className="staff-user-copy"><strong>{staffName}</strong><small>Utility staff</small></span>
          <div className="staff-user-menu">
            <button type="button" aria-label="Staff account options" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><MoreHorizontal size={17} /></button>
            {menuOpen && <button className="signout-menu-item" type="button" onClick={onSignOut}><LogOut size={15} /> Sign out</button>}
          </div>
        </div>
      </aside>
      {mobileNavOpen && <button className="mobile-nav-backdrop" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <div className="staff-workspace">
        <header className="staff-topbar">
          <button className="mobile-nav-toggle" type="button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={20} /></button>
          <div className="mobile-brand"><Brand /></div>
          <span className={`system-status ${online ? "status-online" : "status-degraded"}`}><i />{online ? "System online" : "Connection degraded"}</span>
        </header>
        <main className="staff-main">{children}</main>
        <footer className="staff-footer"><ClipboardList size={14} /> CommunityAlert administration · Nairobi</footer>
      </div>
    </div>
  );
}
