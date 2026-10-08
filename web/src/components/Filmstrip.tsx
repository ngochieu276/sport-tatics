import {
  followChild,
  halfOf,
  MAX_OPTIONS,
  optionChildren,
  rallyLabel,
  shotProfile,
  type Snapshot,
} from "@/domain/badminton";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";

type FilmstripProps = {
  snapshots: Snapshot[];
  rallyId: string;
  playing: boolean;
  onSelect: (id: string) => void;
  onFollow: () => void;
  onAddOption: () => void;
  onDelete: () => void;
  onPlay: () => void;
  onPlayPath: () => void;
  onStop: () => void;
  durationScale: number;
  onDurationScale: (scale: number) => void;
};

export function Filmstrip({
  snapshots,
  rallyId,
  playing,
  onSelect,
  onFollow,
  onAddOption,
  onDelete,
  onPlay,
  onPlayPath,
  onStop,
  durationScale,
  onDurationScale,
}: FilmstripProps) {
  const current = snapshots.find((item) => item.id === rallyId) ?? snapshots[0];
  const opening = snapshots.find((item) => item.parentId === null) ?? snapshots[0];
  const canFollow = Boolean(current) && !followChild(snapshots, current.id) && snapshots.length < 40;
  const optionParentId = current?.parentId ?? current?.id;
  const canAddOption = Boolean(current && optionParentId) &&
    optionChildren(snapshots, optionParentId).length < MAX_OPTIONS &&
    snapshots.length < 40;

  return (
    <section className="flex max-h-[28vh] min-h-0 shrink-0 flex-col gap-3 overflow-hidden border-t border-border bg-card/70 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {playing ? (
          <Button type="button" className="rounded-full" onClick={onStop}>Stop</Button>
        ) : (
          <>
            <Button type="button" className="rounded-full" onClick={onPlay}>Play rally</Button>
            <Button type="button" variant="outline" className="rounded-full" onClick={onPlayPath}>Play path</Button>
          </>
        )}
        <Button
          type="button"
          variant="destructive"
          className="rounded-full"
          onClick={onDelete}
          disabled={playing || !current?.parentId}
        >
          Delete branch
        </Button>
        <div className="ml-auto flex min-w-48 items-center gap-2 text-sm text-muted-foreground">
          <label htmlFor="duration-scale">Duration</label>
          <Slider
            id="duration-scale"
            min={0.6}
            max={2.5}
            step={0.1}
            value={[durationScale]}
            aria-label="Animation duration"
            onValueChange={(values) => onDurationScale(values[0] ?? durationScale)}
            className="w-28"
          />
          <span className="w-10 tabular-nums">{durationScale.toFixed(1)}×</span>
        </div>
      </div>
      <ScrollArea className="min-h-0 w-full flex-1">
        <div className="pb-1">
          {opening && (
            <TreeNode
              snapshot={opening}
              snapshots={snapshots}
              selectedId={current?.id ?? null}
              playing={playing}
              canFollow={canFollow}
              canAddOption={canAddOption}
              onSelect={onSelect}
              onFollow={onFollow}
              onAddOption={onAddOption}
            />
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}

function TreeNode({
  snapshot,
  snapshots,
  selectedId,
  playing,
  canFollow,
  canAddOption,
  onSelect,
  onFollow,
  onAddOption,
}: {
  snapshot: Snapshot;
  snapshots: Snapshot[];
  selectedId: string | null;
  playing: boolean;
  canFollow: boolean;
  canAddOption: boolean;
  onSelect: (id: string) => void;
  onFollow: () => void;
  onAddOption: () => void;
}) {
  const selected = snapshot.id === selectedId;
  const follow = followChild(snapshots, snapshot.id);
  const options = optionChildren(snapshots, snapshot.id);
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <RallyCard
          snapshot={snapshot}
          snapshots={snapshots}
          active={selected}
          onSelect={onSelect}
        />
        {selected && (
          <div className="mt-2 flex w-28 flex-col gap-1">
            <Button type="button" size="xs" className="rounded-full" disabled={playing || !canFollow} onClick={onFollow}>
              Follow rally
            </Button>
            <Button type="button" variant="outline" size="xs" className="rounded-full" disabled={playing || !canAddOption} onClick={onAddOption}>
              New option
            </Button>
          </div>
        )}
        {follow && (
          <div className="mt-1 flex flex-col items-center">
            <div className="h-5 w-px bg-border" />
            <span className="mb-1 text-[10px] tracking-wide text-muted-foreground uppercase">Follow</span>
            <TreeNode
              snapshot={follow}
              snapshots={snapshots}
              selectedId={selectedId}
              playing={playing}
              canFollow={canFollow}
              canAddOption={canAddOption}
              onSelect={onSelect}
              onFollow={onFollow}
              onAddOption={onAddOption}
            />
          </div>
        )}
      </div>
      {options.length > 0 && (
        <div className="flex items-start gap-3 border-l border-dashed border-border pl-3">
          {options.map((option) => (
            <div key={option.id} className="flex flex-col items-center">
              <span className="mb-1 text-[10px] tracking-wide text-muted-foreground uppercase">Option</span>
              <TreeNode
                snapshot={option}
                snapshots={snapshots}
                selectedId={selectedId}
                playing={playing}
                canFollow={canFollow}
                canAddOption={canAddOption}
                onSelect={onSelect}
                onFollow={onFollow}
                onAddOption={onAddOption}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RallyCard({
  snapshot,
  snapshots,
  active,
  onSelect,
}: {
  snapshot: Snapshot;
  snapshots: Snapshot[];
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      aria-pressed={active}
      onClick={() => onSelect(snapshot.id)}
      className={cn(
        "h-auto w-28 shrink-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-left whitespace-normal",
        active && "bg-apron text-line hover:bg-apron/90",
      )}
    >
      <MiniCourt snapshot={snapshot} active={active} />
      <span className="text-sm font-medium">{rallyLabel(snapshots, snapshot)}</span>
      <span className={cn("text-xs", active ? "text-line/80" : "text-muted-foreground")}>
        {shotProfile(snapshot.shot.type).label}
      </span>
    </Button>
  );
}

function MiniCourt({ snapshot, active }: { snapshot: Snapshot; active: boolean }) {
  const hitter = snapshot.players.find((player) => player.id === snapshot.shot.hitterId);
  return (
    <svg viewBox="0 0 100 180" className="size-auto h-16 w-10" aria-hidden="true">
      <rect x="2" y="2" width="96" height="176" rx="3" fill={active ? "#1c7a4a" : "#1c7a4a"} />
      <line x1="2" y1="90" x2="98" y2="90" stroke="#e7f6ee" strokeWidth="2" />
      {(snapshot.coverAreas ?? []).map((area) => (
        <rect
          key={area.id}
          x={area.x0 * 100}
          y={(1 - area.y1) * 180}
          width={(area.x1 - area.x0) * 100}
          height={(area.y1 - area.y0) * 180}
          fill="#7dd3fc"
          fillOpacity="0.45"
        />
      ))}
      {hitter && (
        <line
          x1={hitter.x * 100}
          y1={(1 - hitter.y) * 180}
          x2={snapshot.shot.target.x * 100}
          y2={(1 - snapshot.shot.target.y) * 180}
          stroke="#e2a51a"
          strokeWidth="2"
        />
      )}
      {snapshot.players.map((player) => (
        <circle
          key={player.id}
          cx={player.x * 100}
          cy={(1 - player.y) * 180}
          r="5"
          fill={halfOf(player.id) === "near" ? "#8ec5ef" : "#f0b089"}
        />
      ))}
    </svg>
  );
}
