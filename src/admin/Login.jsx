import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { auth, firebaseError } from "../firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (signInError) {
      setError(signInError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <a className="back-link" href="/"><ArrowLeft size={16} /> Back to community updates</a>
      <section className="login-card">
        <div className="login-icon"><ShieldCheck size={25} /></div>
        <p className="eyebrow">COMMUNITY ALERT</p>
        <h1>Admin sign in</h1>
        <p className="muted">Sign in to post updates for your community.</p>
        {firebaseError && <p className="notice notice-warning">{firebaseError}</p>}
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="form-stack">
          <label>Email address<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button className="button button-primary button-full" type="submit" disabled={!auth || submitting}>
            <LockKeyhole size={16} /> {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="login-footnote">Admin accounts are created in Firebase Authentication.</p>
      </section>
    </main>
  );
}
