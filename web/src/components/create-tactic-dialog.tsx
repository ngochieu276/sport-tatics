import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ChoiceToggle, FormError, GroupChecklist } from "@/components/forms";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Format } from "@/domain/badminton";
import { useGroups } from "@/hooks/use-groups";
import { useCreateTactic } from "@/hooks/use-tactics";

export function CreateTacticDialog({ trigger }: { trigger?: ReactNode }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const createTactic = useCreateTactic();
  const [open, setOpen] = useState(false);
  const { data: groups = [] } = useGroups({ enabled: open });
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<Format>("singles");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function reset(nextOpen: boolean) {
    setTitle("");
    setFormat("singles");
    const preset = searchParams.get("group");
    setGroupIds(preset ? [preset] : []);
    setError(null);
    setOpen(nextOpen);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) {
      setError("Add a title");
      return;
    }
    try {
      const tactic = await createTactic.mutateAsync({
        title: nextTitle,
        format,
        groupIds,
      });
      reset(false);
      navigate(`/tactics/${tactic.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the tactic");
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        {trigger ?? <Button type="button">New tactic</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={(event) => void onSubmit(event)}>
          <DialogHeader>
            <DialogTitle>New tactic</DialogTitle>
            <DialogDescription>Name the rally sequence, then open it on the court.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="create-tactic-name">Name</FieldLabel>
              <Input
                id="create-tactic-name"
                value={title}
                maxLength={80}
                autoFocus
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Backhand smash rotation"
              />
            </Field>
            <ChoiceToggle
              value={format}
              onChange={setFormat}
              options={[
                { value: "singles", label: "Singles" },
                { value: "doubles", label: "Doubles" },
              ]}
              className="grid grid-cols-2"
            />
            {groups.length > 0 && (
              <FieldSet>
                <FieldLegend variant="label">Groups</FieldLegend>
                <GroupChecklist
                  groups={groups}
                  selectedIds={groupIds}
                  onChange={setGroupIds}
                  idPrefix="create-tactic-group"
                />
              </FieldSet>
            )}
            <FormError>{error}</FormError>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => reset(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTactic.isPending}>
              {createTactic.isPending ? "Creating…" : "Create tactic"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
