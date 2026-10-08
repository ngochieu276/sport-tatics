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
import type { GroupSummary } from "@/domain/types";
import { CreateGroupDialog } from "@/components/create-group-dialog";
import { ChoiceToggle, GroupChecklist, SectionHeading } from "./forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type ShotRailProps = {
  format: Format;
  snapshot: Snapshot;
  disabled: boolean;
  notes: string;
  tags: string[];
  groups: GroupSummary[];
  groupIds: string[];
  onHitter: (id: PlayerSlot) => void;
  onType: (type: ShotType) => void;
  onNotes: (notes: string) => void;
  onTags: (tags: string[]) => void;
  onGroupIds: (ids: string[]) => void;
};

export function ShotRail({
  format,
  snapshot,
  disabled,
  notes,
  tags,
  groups,
  groupIds,
  onHitter,
  onType,
  onNotes,
  onTags,
  onGroupIds,
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
    <aside className="hidden min-h-0 w-full flex-col gap-5 overflow-y-auto border-t border-border bg-card/80 p-4 lg:flex lg:border-t-0 lg:border-l">
      <div>
        <SectionHeading>Who hits</SectionHeading>
        <ChoiceToggle
          value={snapshot.shot.hitterId}
          onChange={onHitter}
          disabled={disabled}
          className="mt-2 grid grid-cols-2"
          options={slotsFor(format).map((slot) => ({
            value: slot,
            label: SLOT_LABELS[slot].full,
          }))}
        />
      </div>
      <div>
        <SectionHeading>Shot</SectionHeading>
        <ToggleGroup
          type="single"
          value={snapshot.shot.type}
          onValueChange={(next) => {
            if (next) onType(next as ShotType);
          }}
          variant="outline"
          size="sm"
          disabled={disabled}
          className="mt-2 flex w-full flex-col items-stretch gap-3"
        >
          {SHOT_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1 text-xs text-muted-foreground">{group.label}</p>
              <div className="grid grid-cols-2 gap-2">
                {group.types.map((type) => (
                  <ToggleGroupItem key={type} value={type} className="w-full">
                    {shotProfile(type).label}
                  </ToggleGroupItem>
                ))}
              </div>
            </div>
          ))}
        </ToggleGroup>
      </div>
      <Field>
        <SectionHeading>Notes</SectionHeading>
        <Textarea
          id="tactic-notes"
          value={notes}
          maxLength={2000}
          disabled={disabled}
          onChange={(event) => onNotes(event.target.value)}
          placeholder="When to use this pattern"
          className="min-h-24"
        />
      </Field>
      <div>
        <SectionHeading>Tags</SectionHeading>
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" asChild>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onTags(tags.filter((item) => item !== tag))}
              >
                {tag} <span aria-hidden="true">×</span>
                <span className="sr-only">Remove {tag}</span>
              </button>
            </Badge>
          ))}
        </div>
        <form onSubmit={addTag} className="mt-2 flex gap-2">
          <Input
            value={tagDraft}
            maxLength={24}
            disabled={disabled || tags.length >= 8}
            onChange={(event) => setTagDraft(event.target.value)}
            placeholder="Add a tag"
            aria-label="Add a tag"
          />
          <Button type="submit" disabled={disabled || tags.length >= 8}>Add</Button>
        </form>
      </div>
      <div>
        <SectionHeading>Groups</SectionHeading>
        <div className="mt-2">
          <GroupChecklist
            groups={groups}
            selectedIds={groupIds}
            onChange={onGroupIds}
            disabled={disabled}
            idPrefix="shot-rail-group"
          />
        </div>
        <div className="mt-2">
          <CreateGroupDialog
            disabled={disabled || groupIds.length >= 8}
            onCreated={(group) => {
              if (groupIds.includes(group.id) || groupIds.length >= 8) return;
              onGroupIds([...groupIds, group.id]);
            }}
            trigger={<Button type="button" variant="outline" size="sm" disabled={disabled || groupIds.length >= 8}>New group</Button>}
          />
        </div>
      </div>
    </aside>
  );
}
