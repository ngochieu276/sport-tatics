import { useState, type FormEvent } from "react";
import {
  SHOT_GROUPS,
  SLOT_LABELS,
  shotProfile,
  slotsFor,
  type Format,
  type PlayerSlot,
  type ShotType,
  type Snapshot,
} from "@/domain/badminton";

type ShotRailProps = {
  format: Format;
  snapshot: Snapshot;
  disabled: boolean;
  notes: string;
  tags: string[];
  onHitter: (id: PlayerSlot) => void;
  onType: (type: ShotType) => void;
  onNotes: (notes: string) => void;
  onTags: (tags: string[]) => void;
};

export function ShotRail({
  format,
  snapshot,
  disabled,
  notes,
  tags,
  onHitter,
  onType,
  onNotes,
  onTags,
}: ShotRailProps) {
  const [tagDraft, setTagDraft] = useState("");

  function addTag(event: FormEvent) {
    event.preventDefault();
    const clean = tagDraft.trim().replace(/\s+/g, " ");
    if (!clean || clean.length > 24 || tags.length >= 8) return;
    if (tags.some((tag) => tag.toLowerCase() === clean.toLowerCase())) {
      setTagDraft("");
      return;
    }
    onTags([...tags, clean]);
    setTagDraft("");
  }

  return (
    <aside className="flex min-h-0 w-full flex-col gap-5 border-t border-ink/10 bg-white/80 p-4 lg:overflow-y-auto lg:border-t-0 lg:border-l">
      <div>
        <h2 className="text-xs font-semibold tracking-[0.16em] text-ink/50 uppercase">Who hits</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {slotsFor(format).map((slot) => {
            const active = snapshot.shot.hitterId === slot;
            return (
              <button
                key={slot}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => onHitter(slot)}
                className={`rounded-xl px-2 py-2 text-sm ${
                  active ? "bg-ink text-paper" : "bg-paper text-ink ring-1 ring-ink/10"
                } disabled:opacity-50`}
              >
                {SLOT_LABELS[slot].full}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <h2 className="text-xs font-semibold tracking-[0.16em] text-ink/50 uppercase">Shot</h2>
        <div className="mt-2 space-y-3">
          {SHOT_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1 text-xs text-ink/50">{group.label}</p>
              <div className="grid grid-cols-2 gap-2">
                {group.types.map((type) => {
                  const active = snapshot.shot.type === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={active}
                      disabled={disabled}
                      onClick={() => onType(type)}
                      className={`rounded-xl px-2 py-2 text-sm ${
                        active ? "bg-court text-line" : "bg-paper text-ink ring-1 ring-ink/10"
                      } disabled:opacity-50`}
                    >
                      {shotProfile(type).label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="text-xs font-semibold tracking-[0.16em] text-ink/50 uppercase">Notes</span>
        <textarea
          value={notes}
          maxLength={2000}
          disabled={disabled}
          onChange={(event) => onNotes(event.target.value)}
          placeholder="When to use this pattern"
          className="mt-2 min-h-24 w-full rounded-xl border border-ink/10 bg-paper px-3 py-2 text-sm outline-none"
        />
      </label>
      <div>
        <h2 className="text-xs font-semibold tracking-[0.16em] text-ink/50 uppercase">Tags</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              disabled={disabled}
              onClick={() => onTags(tags.filter((item) => item !== tag))}
              className="rounded-full bg-paper px-2 py-1 text-xs ring-1 ring-ink/10"
            >
              {tag} <span aria-hidden="true">×</span>
              <span className="sr-only">Remove {tag}</span>
            </button>
          ))}
        </div>
        <form onSubmit={addTag} className="mt-2 flex gap-2">
          <input
            value={tagDraft}
            maxLength={24}
            disabled={disabled || tags.length >= 8}
            onChange={(event) => setTagDraft(event.target.value)}
            placeholder="Add a tag"
            aria-label="Add a tag"
            className="w-full rounded-xl border border-ink/10 bg-paper px-3 py-2 text-sm outline-none"
          />
          <button type="submit" disabled={disabled || tags.length >= 8} className="rounded-xl bg-ink px-3 py-2 text-sm text-paper disabled:opacity-40">
            Add
          </button>
        </form>
      </div>
    </aside>
  );
}
