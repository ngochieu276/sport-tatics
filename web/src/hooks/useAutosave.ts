import { useEffect, useRef, useState } from "react";
import type { TacticDraft } from "@/domain/types";
import { ApiError, api } from "../lib/api";

export function useAutosave(id: string, draft: TacticDraft | null) {
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const [error, setError] = useState<string | null>(null);
  const saved = useRef("");
  const latest = useRef("");
  const seenId = useRef<string | null>(null);
  const saving = useRef(false);
  const mounted = useRef(true);
  const idRef = useRef(id);
  idRef.current = id;

  const pump = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  pump.current = async () => {
    if (saving.current) return;
    saving.current = true;
    let attempted = "";
    try {
      while (latest.current && latest.current !== saved.current) {
        const body = latest.current;
        attempted = body;
        const parsed = JSON.parse(body) as TacticDraft;
        if (!parsed.title.trim()) break;
        if (mounted.current) {
          setStatus("saving");
          setError(null);
        }
        await api(`/api/tactics/${idRef.current}`, { method: "PATCH", body });
        saved.current = body;
        if (mounted.current && latest.current === body) setStatus("saved");
      }
    } catch (caught) {
      if (mounted.current) {
        setStatus("error");
        setError(caught instanceof ApiError ? caught.message : "Could not save");
      }
    } finally {
      saving.current = false;
      if (latest.current !== saved.current && latest.current !== attempted && latest.current) {
        void pump.current();
      }
    }
  };

  useEffect(() => {
    if (!draft) return;
    const body = JSON.stringify(draft);
    if (seenId.current !== id) {
      seenId.current = id;
      saved.current = body;
      latest.current = body;
      return;
    }
    latest.current = body;
    if (body === saved.current) {
      setStatus((current) => current === "error" ? current : "saved");
      return;
    }
    if (!draft.title.trim()) return;
    setStatus("saving");
    const handle = window.setTimeout(() => {
      void pump.current();
    }, 700);
    return () => window.clearTimeout(handle);
  }, [draft, id]);

  useEffect(() => {
    return () => {
      void pump.current();
    };
  }, []);

  useEffect(() => {
    const flush = () => {
      const body = latest.current;
      if (!body || body === saved.current) return;
      try {
        const parsed = JSON.parse(body) as TacticDraft;
        if (!parsed.title.trim()) return;
      } catch {
        return;
      }
      void fetch(`/api/tactics/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body,
        keepalive: true,
      });
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [id]);

  return {
    status,
    error,
    retry: () => {
      void pump.current();
    },
  };
}
