import { useState, type FormEvent, type ReactNode } from "react";
import { FormError } from "@/components/forms";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { GroupSummary } from "@/domain/types";
import { useCreateGroup } from "@/hooks/use-groups";

export function CreateGroupDialog({
  trigger,
  onCreated,
  disabled,
}: {
  trigger?: ReactNode;
  onCreated?: (group: GroupSummary) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createGroup = useCreateGroup();

  function reset() {
    setName("");
    setError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next = name.trim();
    if (!next) {
      setError("Add a name");
      return;
    }
    try {
      const group = await createGroup.mutateAsync(next);
      setOpen(false);
      reset();
      onCreated?.(group);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the group");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" disabled={disabled}>
            New group
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={(event) => void onSubmit(event)}>
          <DialogHeader>
            <DialogTitle>New group</DialogTitle>
            <DialogDescription>Use groups to collect related tactics. A tactic can sit in more than one group.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="create-group-name">Name</FieldLabel>
              <Input
                id="create-group-name"
                value={name}
                maxLength={40}
                autoFocus
                onChange={(event) => setName(event.target.value)}
                placeholder="Serve patterns"
              />
            </Field>
            <FormError>{error}</FormError>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createGroup.isPending}>
              {createGroup.isPending ? "Creating…" : "Create group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
