import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import {
  clampTarget,
  copySnapshot,
  shotProfile,
  type Format,
  type PlayerSlot,
  type ShotType,
  type Snapshot,
} from "@/domain/badminton";
import type { TacticDetail, TacticDraft } from "@/domain/types";
import { BadmintonCourt } from "../components/BadmintonCourt";
import { Filmstrip } from "../components/Filmstrip";
import { ShotRail } from "../components/ShotRail";
import { useAutosave } from "../hooks/useAutosave";
import { useRallyPlayback, type PlayMode } from "../hooks/usePlayback";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { ApiError, api } from "../lib/api";
import { StatusScreen } from "../lib/auth";

const DURATION_SCALE_KEY = "sporttactic.durationScale";

function readDurationScale(): number {
  const raw = localStorage.getItem(DURATION_SCALE_KEY);
  const value = raw === null ? 1.4 : Number(raw);
  if (!Number.isFinite(value)) return 1.4;
  return Math.min(2.5, Math.max(0.6, value));
}

export function EditorPage() {
  const { id } = useParams();
  if (!id) return <Navigate to="/tactics" replace />;
  return <Editor key={id} id={id} />;
}

function Editor({ id }: { id: string }) {
  const [draft, setDraft] = useState<TacticDraft | null>(null);
  const [format, setFormat] = useState<Format>("singles");
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<PlayerSlot | null>(null);
  const [playMode, setPlayMode] = useState<PlayMode>("idle");
  const [durationScale, setDurationScale] = useState(readDurationScale);
  const [missing, setMissing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const reduced = usePrefersReducedMotion();
  const { status, error: saveError, retry } = useAutosave(id, draft);
  const playing = playMode !== "idle";
  const pose = useRallyPlayback({
    playing,
    mode: playMode,
    format,
    snapshots: draft?.snapshots ?? [],
    index,
    reduced,
    durationScale,
    onAdvance: setIndex,
    onStop: () => setPlayMode("idle"),
  });

  useEffect(() => {
    let active = true;
    api<{ tactic: TacticDetail }>(`/api/tactics/${id}`)
      .then(({ tactic }) => {
        if (!active) return;
        setFormat(tactic.format);
        setDraft({
          title: tactic.title,
          notes: tactic.notes,
          tags: tactic.tags,
          snapshots: tactic.snapshots,
        });
        setSelectedId(tactic.snapshots[0]?.shot.hitterId ?? null);
        setIndex(0);
      })
      .catch((caught) => {
        if (!active) return;
        if (caught instanceof ApiError && caught.status === 404) setMissing(true);
        else setLoadError(caught instanceof Error ? caught.message : "Could not load this tactic");
      });
    return () => {
      active = false;
    };
  }, [id]);

  const snapshot = draft?.snapshots[index];

  function updateSnapshot(patch: (snapshot: Snapshot) => Snapshot) {
    setPlayMode("idle");
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        snapshots: current.snapshots.map((item, itemIndex) => itemIndex === index ? patch(item) : item),
      };
    });
  }

  function addRally() {
    if (!draft || draft.snapshots.length >= 40) return;
    const source = draft.snapshots[index];
    if (!source) return;
    const snapshots = [...draft.snapshots, copySnapshot(source)];
    setPlayMode("idle");
    setDraft({ ...draft, snapshots });
    setIndex(snapshots.length - 1);
  }

  function deleteRally() {
    if (!draft || draft.snapshots.length <= 1) return;
    const snapshots = draft.snapshots.filter((_, itemIndex) => itemIndex !== index);
    setPlayMode("idle");
    setDraft({ ...draft, snapshots });
    setIndex(Math.min(index, snapshots.length - 1));
  }

  function moveRally(direction: -1 | 1) {
    if (!draft) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.snapshots.length) return;
    const snapshots = draft.snapshots.slice();
    const [item] = snapshots.splice(index, 1);
    if (!item) return;
    snapshots.splice(nextIndex, 0, item);
    setPlayMode("idle");
    setDraft({ ...draft, snapshots });
    setIndex(nextIndex);
  }

  if (missing) {
    return (
      <StatusScreen>
        <div className="text-center">
          <p>That tactic is not in your library.</p>
          <Link to="/tactics" className="mt-3 inline-block underline">Back to tactics</Link>
        </div>
      </StatusScreen>
    );
  }
  if (loadError) return <StatusScreen>{loadError}</StatusScreen>;
  if (!draft || !snapshot) return <StatusScreen>Loading tactic…</StatusScreen>;

  const players = pose?.players ?? snapshot.players;
  const shuttle = playing && !reduced ? pose?.shuttle ?? null : null;
  const titleMissing = draft.title.trim().length === 0;
  const shotLabel = shotProfile(snapshot.shot.type).label;

  return (
    <div className="flex min-h-dvh w-full max-w-full flex-col overflow-x-hidden lg:h-dvh lg:overflow-hidden">
      <header className="flex h-16 w-full shrink-0 items-center gap-3 border-b border-ink/10 px-4">
        <Link to="/tactics" className="text-sm text-ink/70 underline">Tactics</Link>
        <input
          aria-label="Tactic title"
          value={draft.title}
          maxLength={80}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          className="min-w-0 flex-1 bg-transparent font-display text-2xl outline-none"
        />
        <span className="rounded-full bg-court/10 px-2 py-1 text-xs tracking-wide text-court uppercase">{format}</span>
        <p className="hidden text-sm text-ink/60 sm:block" role="status">
          {titleMissing ? "Add a title to save" : status === "saving" ? "Saving…" : status === "error" ? "Not saved" : "Saved"}
        </p>
        {status === "error" && (
          <button type="button" className="text-sm underline" onClick={retry}>Retry</button>
        )}
      </header>
      {saveError && <p className="bg-far/10 px-4 py-2 text-sm text-far" role="alert">{saveError}</p>}
      <div className="grid min-h-0 w-full flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-h-[520px] min-w-0 flex-1 flex-col items-center px-4 py-3 lg:min-h-0">
          <p className="mb-2 text-sm text-ink/70" aria-live="polite">
            Rally {index + 1} · {shotLabel}
            {playing ? " · playing" : ""}
          </p>
          <div className="flex h-full min-h-0 w-full min-w-0 flex-1 items-center justify-center overflow-hidden">
            <BadmintonCourt
              format={format}
              players={players}
              shot={snapshot.shot}
              selectedId={selectedId}
              interactive={!playing}
              shuttle={shuttle}
              showArrow={!playing || reduced}
              onSelect={setSelectedId}
              onMovePlayer={(playerId, point) => {
                updateSnapshot((current) => ({
                  ...current,
                  players: current.players.map((player) => player.id === playerId ? { ...player, x: point.x, y: point.y } : player),
                }));
              }}
              onMoveTarget={(point) => {
                updateSnapshot((current) => ({
                  ...current,
                  shot: { ...current.shot, target: point },
                }));
              }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-ink/50">
            Drag a player to move them. Drag the gold mark, or click the opposite half, to aim the shuttlecock. Arrow keys nudge the selected player.
          </p>
        </div>
        <ShotRail
          format={format}
          snapshot={snapshot}
          disabled={playing}
          notes={draft.notes}
          tags={draft.tags}
          onHitter={(hitterId) => {
            setSelectedId(hitterId);
            updateSnapshot((current) => ({
              ...current,
              shot: {
                ...current.shot,
                hitterId,
                target: clampTarget(format, hitterId, current.shot.target),
              },
            }));
          }}
          onType={(type: ShotType) => {
            updateSnapshot((current) => ({
              ...current,
              shot: { ...current.shot, type },
            }));
          }}
          onNotes={(notes) => setDraft({ ...draft, notes })}
          onTags={(tags) => setDraft({ ...draft, tags })}
        />
      </div>
      <Filmstrip
        format={format}
        snapshots={draft.snapshots}
        selectedIndex={index}
        playing={playing}
        onSelect={(next) => {
          setPlayMode("idle");
          setIndex(next);
          const chosen = draft.snapshots[next];
          if (chosen) setSelectedId(chosen.shot.hitterId);
        }}
        onAdd={addRally}
        onDelete={deleteRally}
        onMove={moveRally}
        onPlay={() => setPlayMode("one")}
        onPlayAll={() => {
          setIndex(0);
          setPlayMode("all");
        }}
        onStop={() => setPlayMode("idle")}
        durationScale={durationScale}
        onDurationScale={(scale) => {
          setDurationScale(scale);
          localStorage.setItem(DURATION_SCALE_KEY, String(scale));
        }}
      />
    </div>
  );
}
