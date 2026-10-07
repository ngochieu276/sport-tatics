import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import type { Format } from "@/domain/badminton";
import type { TacticDetail, TacticSummary } from "@/domain/types";
import { Logo } from "../components/Logo";
import { ApiError, api } from "../lib/api";
import { useAuth } from "../lib/auth";

const filters: Array<{ id: "" | Format; label: string }> = [
  { id: "", label: "All" },
  { id: "singles", label: "Singles" },
  { id: "doubles", label: "Doubles" },
];

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function LibraryPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState<"" | Format>("");
  const [tactics, setTactics] = useState<TacticSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [createFormat, setCreateFormat] = useState<Format>("singles");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api<{ tactics: TacticSummary[] }>("/api/tactics", { signal: controller.signal })
      .then((result) => {
        setTactics(result.tactics);
        setError(null);
      })
      .catch((caught) => {
        if (isAbort(caught)) return;
        setError(caught instanceof Error ? caught.message : "Could not load tactics");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tactics.filter((tactic) => {
      if (format && tactic.format !== format) return false;
      if (needle && !tactic.title.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [format, query, tactics]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) {
      setCreateError("Add a title");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const result = await api<{ tactic: TacticDetail }>("/api/tactics", {
        method: "POST",
        body: JSON.stringify({ title: nextTitle, format: createFormat }),
      });
      navigate(`/tactics/${result.tactic.id}`);
    } catch (caught) {
      setCreateError(caught instanceof ApiError ? caught.message : "Could not create the tactic");
      setCreating(false);
    }
  }

  async function onDelete(tactic: TacticSummary) {
    if (!window.confirm(`Delete "${tactic.title}"?`)) return;
    try {
      await api(`/api/tactics/${tactic.id}`, { method: "DELETE" });
      setTactics((current) => current.filter((item) => item.id !== tactic.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete the tactic");
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-6xl px-5 py-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Logo />
        <div className="flex items-center gap-3 text-sm">
          <span className="text-ink/70">{user?.email}</span>
          <button
            type="button"
            className="rounded-full bg-white px-3 py-1.5 ring-1 ring-ink/15"
            onClick={() => void logout()}
          >
            Log out
          </button>
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <form onSubmit={onCreate} className="h-fit rounded-3xl bg-white p-5 ring-1 ring-ink/10">
          <h1 className="font-display text-3xl">New tactic</h1>
          <label className="mt-4 block text-sm">
            Title
            <input
              value={title}
              maxLength={80}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Backhand smash rotation"
              className="mt-2 w-full rounded-xl border border-ink/15 bg-paper px-3 py-2 outline-none"
            />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(["singles", "doubles"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={createFormat === option}
                onClick={() => setCreateFormat(option)}
                className={`rounded-xl px-3 py-2 text-sm capitalize ${
                  createFormat === option ? "bg-court text-line" : "bg-paper ring-1 ring-ink/10"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          {createError && <p className="mt-3 text-sm text-far" role="alert">{createError}</p>}
          <button
            type="submit"
            disabled={creating}
            className="mt-4 w-full rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create tactic"}
          </button>
        </form>

        <section>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              {filters.map((filter) => (
                <button
                  key={filter.label}
                  type="button"
                  aria-pressed={format === filter.id}
                  onClick={() => setFormat(filter.id)}
                  className={`rounded-full px-3 py-1.5 text-sm ${
                    format === filter.id ? "bg-ink text-paper" : "bg-white ring-1 ring-ink/10"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search titles"
              aria-label="Search tactics"
              className="min-w-48 flex-1 rounded-full border border-ink/15 bg-white px-4 py-2 text-sm outline-none"
            />
          </div>

          {error && <p className="mt-4 text-sm text-far" role="alert">{error}</p>}
          {loading && tactics.length === 0 ? <p className="mt-8 text-sm text-ink/60">Loading tactics…</p> : null}
          {!loading && visible.length === 0 ? (
            <p className="mt-8 max-w-md text-ink/70">
              {query.trim() || format ? "No tactics match that search." : "Your library is empty. Create a tactic to start a rally."}
            </p>
          ) : null}

          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {visible.map((tactic) => (
              <li key={tactic.id} className="rounded-3xl bg-white p-5 ring-1 ring-ink/10">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-2xl leading-tight">
                    <Link to={`/tactics/${tactic.id}`} className="hover:underline">{tactic.title}</Link>
                  </h2>
                  <span className="rounded-full bg-court/10 px-2 py-1 text-xs tracking-wide text-court uppercase">
                    {tactic.format}
                  </span>
                </div>
                <p className="mt-3 text-sm text-ink/70">
                  {tactic.snapshotCount} {tactic.snapshotCount === 1 ? "rally" : "rallies"} · {formatWhen(tactic.updatedAt)}
                </p>
                {tactic.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tactic.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-paper px-2 py-0.5 text-xs">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex gap-3 text-sm">
                  <Link to={`/tactics/${tactic.id}`} className="font-medium underline">Open court</Link>
                  <button type="button" className="text-far" onClick={() => void onDelete(tactic)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
