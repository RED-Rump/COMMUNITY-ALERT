import { useState } from "react";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  HelpCircle,
  LockKeyhole,
  LogIn,
  Mail,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { auth, firebaseError } from "../firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (signInError) {
      console.error("Staff sign-in failed.", signInError);
      setError("Email or password is incorrect.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasswordReset() {
    if (!email.trim()) {
      setError("Enter your staff email address first.");
      return;
    }
    setError("");
    setNotice("");
    setResetting(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice("If this email belongs to a staff account, password reset instructions have been sent.");
    } catch (resetError) {
      console.error("Could not send password reset email.", resetError);
      setError("Could not send reset instructions. Check the email and try again.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <main className="staff-login-page">
      <section className="login-brand-panel" aria-label="CommunityAlert staff portal">
        <a href="/" className="login-brand"><span className="login-brand-mark"><Radio size={20} /></span><span>Community<span>Alert</span></span></a>
        <div className="login-brand-content">
          <span className="login-hero-icon"><Radio size={27} /></span>
          <p className="login-eyebrow">UTILITY STAFF PORTAL</p>
          <h1>Publish clear outage updates for Nairobi residents.</h1>
          <p>Create, update and resolve water or power alerts from one focused workspace.</p>
        </div>
        <div className="authorised-notice"><ShieldCheck size={19} /><span>Authorised staff access only. Resident status does not require login.</span></div>
      </section>
      <section className="login-main-panel">
        <a className="mobile-login-brand" href="/"><span className="login-brand-mark"><Radio size={19} /></span><span>Community<span>Alert</span></span></a>
        <a className="login-back-link" href="/"><ArrowLeft size={15} /> Back to community updates</a>
        <div className="login-card">
          <div className="login-card-icon"><ShieldCheck size={23} /></div>
          <h2>Admin sign in</h2>
          <p className="login-subtitle">Use your staff email to manage service alerts.</p>
          {firebaseError && <p className="notice notice-warning" role="status">{firebaseError}</p>}
          <form onSubmit={handleSubmit} className="login-form">
            <label htmlFor="staff-email">Email address</label>
            <div className="login-input-wrap"><Mail size={17} /><input id="staff-email" type="email" autoComplete="username" placeholder="name@utility.example" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
            <div className="login-password-label"><label htmlFor="staff-password">Password</label><button className="login-text-button" type="button" onClick={handlePasswordReset} disabled={!auth || resetting}>{resetting ? "Sending…" : "Forgot password?"}</button></div>
            <div className="login-input-wrap"><LockKeyhole size={17} /><input id="staff-password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /><button className="password-visibility" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
            {error && <p className="login-error" role="alert"><AlertCircle size={15} />{error}</p>}
            {notice && <p className="login-success" role="status">{notice}</p>}
            <button className="admin-button admin-button-login" type="submit" disabled={!auth || submitting}>
              <LogIn size={17} />{submitting ? "Signing in…" : "Sign in securely"}
            </button>
          </form>
          <p className="login-help"><HelpCircle size={15} />Need access? Contact your system administrator.</p>
        </div>
        <p className="login-footer">CommunityAlert administration · Nairobi</p>
      </section>
    </main>
  );
}
