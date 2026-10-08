import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { Logo } from "../components/Logo";
import { FormError } from "../components/forms";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
      <form onSubmit={onSubmit} className="mt-8">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="login-email">Email</FieldLabel>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="login-password">Password</FieldLabel>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <FormError>{error}</FormError>
          <Button type="submit" className="w-full rounded-full" disabled={submitting}>
            {submitting ? "Logging in…" : "Log in"}
          </Button>
        </FieldGroup>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        New here?{" "}
        <Button variant="link" className="h-auto p-0" asChild>
          <Link to="/register">Create an account</Link>
        </Button>
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
      <form onSubmit={onSubmit} className="mt-8">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="register-email">Email</FieldLabel>
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="register-password">Password</FieldLabel>
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <FieldDescription>Use at least 8 characters. Tactics stay private to this account.</FieldDescription>
          </Field>
          <FormError>{error}</FormError>
          <Button type="submit" className="w-full rounded-full bg-court text-line hover:bg-court/90" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </Button>
        </FieldGroup>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Button variant="link" className="h-auto p-0" asChild>
          <Link to="/login">Log in</Link>
        </Button>
      </p>
    </AuthShell>
  );
}
