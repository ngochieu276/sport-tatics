import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import {
  clampTarget,
  copySnapshot,
  createCoverArea,
  descendantIds,
  followChild,
  MAX_COVER_AREAS,
  MAX_OPTIONS,
  optionChildren,
  rallyLabel,
  pathTo,
  shotProfile,
  type Format,
  type PlayerSlot,
  type ShotType,
  type Snapshot,
} from "@/domain/badminton";
import type { TacticDraft } from "@/domain/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BadmintonCourt } from "../components/BadmintonCourt";
import { CourtToolbox } from "../components/CourtToolbox";
import { Filmstrip } from "../components/Filmstrip";
import { ShotRail } from "../components/ShotRail";
import { useAutosave } from "../hooks/useAutosave";
import { useRallyPlayback, type PlayMode } from "../hooks/usePlayback";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { useGroups } from "../hooks/use-groups";
import { useTactic } from "../hooks/use-tactics";
import { ApiError } from "../lib/api";

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
  const tacticQuery = useTactic(id);
  const groupsQuery = useGroups();
  const tactic = tacticQuery.data;
  const groups = groupsQuery.data ?? [];
  const [draft, setDraft] = useState<TacticDraft | null>(null);
  const [format, setFormat] = useState<Format>("singles");
  const [rallyId, setRallyId] = useState<string | null>(null);
  const [pathEndId, setPathEndId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<PlayerSlot | null>(null);
  const [selectedCoverId, setSelectedCoverId] = useState<string | null>(null);
  const [playMode, setPlayMode] = useState<PlayMode>("idle");
  const [durationScale, setDurationScale] = useState(readDurationScale);
  const reduced = usePrefersReducedMotion();
  const { status, error: saveError, retry } = useAutosave(id, draft);
  const playing = playMode !== "idle";
  const pose = useRallyPlayback({
    playing,
    mode: playMode,
    snapshots: draft?.snapshots ?? [],
    rallyId: rallyId ?? "",
    pathEndId,
    reduced,
    durationScale,
    onAdvance: setRallyId,
    onStop: () => setPlayMode("idle"),
  });

  useEffect(() => {
    if (!tactic || draft) return;
    setFormat(tactic.format);
    setDraft({
      title: tactic.title,
      notes: tactic.notes,
      tags: tactic.tags,
      snapshots: tactic.snapshots,
      groupIds: tactic.groupIds ?? tactic.groups?.map((group) => group.id) ?? [],
    });
    const opening = tactic.snapshots.find((item) => item.parentId === null) ?? tactic.snapshots[0];
    setRallyId(opening?.id ?? null);
    setSelectedId(opening?.shot.hitterId ?? null);
  }, [draft, tactic]);

  const snapshot = draft?.snapshots.find((item) => item.id === rallyId)
    ?? draft?.snapshots.find((item) => item.parentId === null)
    ?? draft?.snapshots[0];

  function updateSnapshot(patch: (snapshot: Snapshot) => Snapshot) {
    setPlayMode("idle");
    setDraft((current) => {
      if (!current || !snapshot) return current;
      return {
        ...current,
        snapshots: current.snapshots.map((item) => item.id === snapshot.id ? patch(item) : item),
      };
    });
  }

  function addFollow() {
    if (!draft || !snapshot || draft.snapshots.length >= 40) return;
    if (followChild(draft.snapshots, snapshot.id)) return;
    const next = copySnapshot(snapshot, { parentId: snapshot.id, kind: "follow" });
    setPlayMode("idle");
    setDraft({ ...draft, snapshots: [...draft.snapshots, next] });
    setRallyId(next.id);
    setSelectedId(next.shot.hitterId);
    setSelectedCoverId(null);
  }

  function addOption() {
    if (!draft || !snapshot || draft.snapshots.length >= 40) return;
    const parentId = snapshot.parentId ?? snapshot.id;
    if (optionChildren(draft.snapshots, parentId).length >= MAX_OPTIONS) return;
    const next = copySnapshot(snapshot, { parentId, kind: "option" });
    setPlayMode("idle");
    setDraft({ ...draft, snapshots: [...draft.snapshots, next] });
    setRallyId(next.id);
    setSelectedId(next.shot.hitterId);
    setSelectedCoverId(null);
  }

  function deleteRally() {
    if (!draft || !snapshot?.parentId) return;
    const drop = new Set(descendantIds(draft.snapshots, snapshot.id));
    setPlayMode("idle");
    setDraft({ ...draft, snapshots: draft.snapshots.filter((item) => !drop.has(item.id)) });
    const parent = draft.snapshots.find((item) => item.id === snapshot.parentId);
    setRallyId(snapshot.parentId);
    setSelectedCoverId(null);
    if (parent) setSelectedId(parent.shot.hitterId);
  }

  const missing = tacticQuery.isError && tacticQuery.error instanceof ApiError && tacticQuery.error.status === 404;
  const loadError = tacticQuery.isError && !missing
    ? (tacticQuery.error instanceof Error ? tacticQuery.error.message : "Could not load this tactic")
    : null;

  if (missing) {
    return (
      <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
        <div className="text-center">
          <p>That tactic is not in your library.</p>
          <Button variant="link" className="mt-3" asChild>
            <Link to="/tactics">Back to tactics</Link>
          </Button>
        </div>
      </div>
    );
  }
  if (loadError) return <div className="grid flex-1 place-items-center text-sm text-muted-foreground">{loadError}</div>;
  if (!draft || !snapshot) return <div className="grid flex-1 place-items-center text-sm text-muted-foreground">Loading tactic…</div>;

  const players = pose?.players ?? snapshot.players;
  const shuttle = playing && !reduced ? pose?.shuttle ?? null : null;
  const titleMissing = draft.title.trim().length === 0;
  const shotLabel = shotProfile(snapshot.shot.type).label;
  const stepLabel = rallyLabel(draft.snapshots, snapshot);

  return (
    <div className="flex min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden">
      <header className="flex h-14 w-full shrink-0 items-center gap-3 border-b border-border px-4">
        <Input
          aria-label="Tactic name"
          value={draft.title}
          maxLength={80}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          placeholder="Tactic name"
          className="h-10 min-w-0 flex-1 bg-card font-display text-2xl md:text-2xl"
        />
        <Badge className="bg-court/10 text-court uppercase">{format}</Badge>
        <p className="hidden text-sm text-muted-foreground sm:block" role="status">
          {titleMissing ? "Add a title to save" : status === "saving" ? "Saving…" : status === "error" ? "Not saved" : "Saved"}
        </p>
        {status === "error" && (
          <Button type="button" variant="link" className="px-0" onClick={retry}>Retry</Button>
        )}
      </header>
      {saveError && (
        <Alert variant="destructive" className="rounded-none border-x-0">
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}
      <div className="grid min-h-0 w-full flex-1 grid-cols-1 overflow-hidden max-lg:grid-rows-[minmax(0,1fr)_minmax(8rem,36vh)] lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex h-full min-h-0 min-w-0 flex-col items-center overflow-hidden px-4 py-3">
          <p className="mb-2 shrink-0 text-sm text-muted-foreground" aria-live="polite">
            {stepLabel} · {shotLabel}
            {playing ? " · playing" : ""}
          </p>
          <CourtToolbox
            disabled={playing}
            coverCount={(snapshot.coverAreas ?? []).length}
            selectedCoverId={selectedCoverId}
            onAddCoverArea={() => {
              const areas = snapshot.coverAreas ?? [];
              if (areas.length >= MAX_COVER_AREAS) return;
              const next = createCoverArea(format, snapshot.shot.hitterId, areas);
              setSelectedCoverId(next.id);
              updateSnapshot((current) => ({
                ...current,
                coverAreas: [...(current.coverAreas ?? []), next],
              }));
            }}
            onDeleteCoverArea={() => {
              if (!selectedCoverId) return;
              updateSnapshot((current) => ({
                ...current,
                coverAreas: (current.coverAreas ?? []).filter((area) => area.id !== selectedCoverId),
              }));
              setSelectedCoverId(null);
            }}
          />
          <div className="relative min-h-0 w-full min-w-0 flex-1 overflow-hidden">
            <BadmintonCourt
              format={format}
              players={players}
              shot={snapshot.shot}
              coverAreas={snapshot.coverAreas ?? []}
              selectedCoverId={selectedCoverId}
              selectedId={selectedId}
              interactive={!playing}
              shuttle={shuttle}
              showArrow={!playing || reduced}
              onSelect={(id) => {
                setSelectedCoverId(null);
                setSelectedId(id);
              }}
              onSelectCover={(id) => setSelectedCoverId(id)}
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
              onMoveCoverArea={(id, bounds) => {
                updateSnapshot((current) => ({
                  ...current,
                  coverAreas: (current.coverAreas ?? []).map((area) => area.id === id ? { ...area, ...bounds } : area),
                }));
              }}
              onDeleteCoverArea={(id) => {
                updateSnapshot((current) => ({
                  ...current,
                  coverAreas: (current.coverAreas ?? []).filter((area) => area.id !== id),
                }));
                if (selectedCoverId === id) setSelectedCoverId(null);
              }}
            />
          </div>
          <p className="mt-2 shrink-0 text-center text-xs text-muted-foreground">
            Use Tools to add a cover area, then drag it into shape. Click × or Delete cover area to remove it.
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
          groups={groups}
          groupIds={draft.groupIds ?? []}
          onGroupIds={(groupIds) => setDraft({ ...draft, groupIds })}
        />
      </div>
      <Filmstrip
        snapshots={draft.snapshots}
        rallyId={snapshot.id}
        playing={playing}
        onSelect={(id) => {
          setPlayMode("idle");
          setRallyId(id);
          setSelectedCoverId(null);
          const chosen = draft.snapshots.find((item) => item.id === id);
          if (chosen) setSelectedId(chosen.shot.hitterId);
        }}
        onFollow={addFollow}
        onAddOption={addOption}
        onDelete={deleteRally}
        onPlay={() => setPlayMode("one")}
        onPlayPath={() => {
          const line = pathTo(draft.snapshots, snapshot.id);
          const opening = line[0];
          if (!opening) return;
          setPathEndId(snapshot.id);
          setRallyId(opening.id);
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
