import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Format } from "@/domain/badminton";
import type { TacticSummary } from "@/domain/types";
import { ChoiceToggle, ConfirmAction } from "@/components/forms";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useGroups } from "@/hooks/use-groups";
import { useDeleteTactic, usePatchTactic, useTactics } from "@/hooks/use-tactics";

const formatFilters: Array<{ value: "all" | Format; label: string }> = [
  { value: "all", label: "All" },
  { value: "singles", label: "Singles" },
  { value: "doubles", label: "Doubles" },
];

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function LibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const groupId = searchParams.get("group") ?? "";
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState<"" | Format>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const tacticsQuery = useTactics();
  const groupsQuery = useGroups();
  const patchTactic = usePatchTactic();
  const deleteTactic = useDeleteTactic();
  const tactics = tacticsQuery.data ?? [];
  const groups = groupsQuery.data ?? [];
  const error = tacticsQuery.error ?? groupsQuery.error;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tactics.filter((tactic) => {
      if (format && tactic.format !== format) return false;
      if (groupId && !(tactic.groups ?? []).some((group) => group.id === groupId)) return false;
      if (needle && !tactic.title.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [format, groupId, query, tactics]);

  const loading = tacticsQuery.isPending && tactics.length === 0;

  async function saveTitle(tactic: TacticSummary) {
    const nextTitle = editTitle.trim();
    setEditingId(null);
    if (!nextTitle || nextTitle === tactic.title) return;
    try {
      await patchTactic.mutateAsync({ id: tactic.id, title: nextTitle });
    } catch {
      /* error surfaces on the mutation; list stays as last successful data */
    }
  }

  async function toggleTacticGroup(tactic: TacticSummary, nextId: string) {
    const currentIds = (tactic.groups ?? []).map((group) => group.id);
    const groupIds = currentIds.includes(nextId)
      ? currentIds.filter((id) => id !== nextId)
      : [...currentIds, nextId].slice(0, 8);
    await patchTactic.mutateAsync({ id: tactic.id, groupIds });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 overflow-auto px-4 py-5">
      <div className="flex flex-wrap items-center gap-3">
        <ChoiceToggle
          value={format || "all"}
          onChange={(next) => setFormat(next === "all" ? "" : next)}
          options={formatFilters}
          className="w-fit"
          itemClassName="rounded-full flex-none"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search names"
          aria-label="Search tactics"
          className="min-w-48 flex-1 rounded-full"
        />
      </div>
      {groupId && (
        <p className="text-sm text-muted-foreground">
          Showing {(groups.find((group) => group.id === groupId)?.name) ?? "group"}
          {" "}
          <Button type="button" variant="link" className="h-auto px-0" onClick={() => setSearchParams({})}>
            Clear
          </Button>
        </p>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error instanceof Error ? error.message : "Could not load tactics"}</AlertDescription>
        </Alert>
      )}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </div>
      ) : null}
      {!loading && visible.length === 0 ? (
        <p className="max-w-md text-muted-foreground">
          {query.trim() || format || groupId ? "No tactics match that search." : "Your library is empty. Create a tactic to start a rally."}
        </p>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2">
        {visible.map((tactic) => (
          <li key={tactic.id}>
            <Card className="rounded-3xl py-5">
              <CardHeader>
                {editingId === tactic.id ? (
                  <Input
                    value={editTitle}
                    maxLength={80}
                    autoFocus
                    aria-label="Tactic name"
                    onChange={(event) => setEditTitle(event.target.value)}
                    onBlur={() => void saveTitle(tactic)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void saveTitle(tactic);
                      if (event.key === "Escape") setEditingId(null);
                    }}
                    className="h-10 font-display text-2xl md:text-2xl"
                  />
                ) : (
                  <CardTitle className="font-display text-2xl leading-tight">
                    <Link to={`/tactics/${tactic.id}`} className="hover:underline">{tactic.title}</Link>
                  </CardTitle>
                )}
                <CardAction>
                  <Badge className="bg-court/10 text-court uppercase">{tactic.format}</Badge>
                </CardAction>
                <CardDescription>
                  {tactic.snapshotCount} {tactic.snapshotCount === 1 ? "rally" : "rallies"} · {formatWhen(tactic.updatedAt)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(tactic.groups ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tactic.groups.map((group) => (
                      <Badge key={group.id} variant="secondary">{group.name}</Badge>
                    ))}
                  </div>
                )}
                {tactic.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tactic.tags.map((tag) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                )}
                {groups.length > 0 && (
                  <ToggleGroup
                    type="multiple"
                    value={(tactic.groups ?? []).map((group) => group.id)}
                    onValueChange={(ids) => {
                      const currentIds = (tactic.groups ?? []).map((group) => group.id);
                      const added = ids.find((id) => !currentIds.includes(id));
                      const removed = currentIds.find((id) => !ids.includes(id));
                      const nextId = added ?? removed;
                      if (nextId) void toggleTacticGroup(tactic, nextId);
                    }}
                    variant="outline"
                    size="sm"
                    className="mt-3 flex flex-wrap"
                  >
                    {groups.map((group) => (
                      <ToggleGroupItem key={group.id} value={group.id} className="rounded-full">
                        {group.name}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                )}
              </CardContent>
              <CardFooter className="gap-2 bg-transparent">
                <Button variant="link" className="px-0" asChild>
                  <Link to={`/tactics/${tactic.id}`}>Open court</Link>
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="px-0"
                  onClick={() => {
                    setEditingId(tactic.id);
                    setEditTitle(tactic.title);
                  }}
                >
                  Rename
                </Button>
                <ConfirmAction
                  title={`Delete ${tactic.title}?`}
                  description="This rally sequence will be removed from your library."
                  onConfirm={() => deleteTactic.mutate(tactic.id)}
                >
                  <Button type="button" variant="link" className="px-0 text-destructive">
                    Delete
                  </Button>
                </ConfirmAction>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
