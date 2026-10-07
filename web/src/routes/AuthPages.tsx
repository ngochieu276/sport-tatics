import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { Logo } from "../components/Logo";
import { useAuth } from "../lib/auth";

function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.15fr_0.85fr]">
      <section className="hidden flex-col justify-between bg-apron p-12 text-line lg:flex">
        <Logo light />
        <div>
          <h1 className="max-w-xl font-display text-6xl leading-[1.05]">Diagram the rally, then play it back.</h1>
          <p className="mt-5 max-w-md text-lg text-line/80">
            Place each player, choose the shot, and keep the tactic as a sequence of rallies on a badminton court.
          </p>
        </div>
        <p className="text-sm tracking-wide text-line/70 uppercase">Singles and doubles</p>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h2 className="font-display text-4xl">{title}</h2>
          {children}
        </div>
      </section>
    </div>
  );
}

const fieldClass = "mt-2 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 outline-none";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/tactics");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not log in");
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Log in">
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={fieldClass}
          />
        </label>
        {error && <p className="text-sm text-far" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-50"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-6 text-sm text-ink/70">
        New here? <Link to="/register" className="font-medium text-ink underline">Create an account</Link>
      </p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await register(email, password);
      navigate("/tactics");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the account");
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Create an account">
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={fieldClass}
          />
        </label>
        <p className="text-xs text-ink/60">Use at least 8 characters. Tactics stay private to this account.</p>
        {error && <p className="text-sm text-far" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-court px-4 py-2.5 text-sm font-medium text-line disabled:opacity-50"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-sm text-ink/70">
        Already have an account? <Link to="/login" className="font-medium text-ink underline">Log in</Link>
      </p>
    </AuthShell>
  );
}
