import { QueryClient } from "@tanstack/react-query";
import type { GroupSummary, TacticDetail, TacticSummary } from "@/domain/types";
import { ApiError } from "./api";

export const queryKeys = {
  tactics: ["tactics", "list"] as const,
  tactic: (id: string) => ["tactics", "detail", id] as const,
  groups: ["groups"] as const,
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: (count, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        if (error instanceof DOMException && error.name === "AbortError") return false;
        return count < 1;
      },
    },
  },
});

export function asTacticSummary(tactic: TacticDetail): TacticSummary {
  return {
    id: tactic.id,
    format: tactic.format,
    title: tactic.title,
    tags: tactic.tags,
    groups: tactic.groups,
    snapshotCount: tactic.snapshots.length,
    updatedAt: tactic.updatedAt,
  };
}

function recomputeGroupCounts() {
  const tactics = queryClient.getQueryData<TacticSummary[]>(queryKeys.tactics);
  const groups = queryClient.getQueryData<GroupSummary[]>(queryKeys.groups);
  if (!groups || !tactics) return;
  const counts = new Map<string, number>();
  if (tactics) {
    for (const tactic of tactics) {
      for (const group of tactic.groups ?? []) {
        counts.set(group.id, (counts.get(group.id) ?? 0) + 1);
      }
    }
  }
  queryClient.setQueryData<GroupSummary[]>(queryKeys.groups, groups.map((group) => ({
    ...group,
    tacticCount: counts.get(group.id) ?? 0,
  })));
}

export function cacheTactic(tactic: TacticDetail) {
  queryClient.setQueryData(queryKeys.tactic(tactic.id), tactic);
  const summary = asTacticSummary(tactic);
  queryClient.setQueryData<TacticSummary[]>(queryKeys.tactics, (list) => {
    if (!list) return list;
    const index = list.findIndex((item) => item.id === summary.id);
    if (index === -1) return [summary, ...list];
    const next = list.slice();
    next[index] = { ...list[index], ...summary };
    return next;
  });
  recomputeGroupCounts();
}

export function dropTactic(id: string) {
  queryClient.removeQueries({ queryKey: queryKeys.tactic(id) });
  queryClient.setQueryData<TacticSummary[]>(queryKeys.tactics, (list) => (
    list?.filter((item) => item.id !== id)
  ));
  recomputeGroupCounts();
}

export function cacheGroup(group: GroupSummary) {
  queryClient.setQueryData<GroupSummary[]>(queryKeys.groups, (list) => {
    const rows = list ?? [];
    const index = rows.findIndex((item) => item.id === group.id);
    const next = index === -1
      ? [...rows, group]
      : rows.map((item) => item.id === group.id ? { ...item, ...group } : item);
    return next.slice().sort((a, b) => a.name.localeCompare(b.name));
  });
}

export function renameCachedGroup(group: GroupSummary) {
  cacheGroup(group);
  queryClient.setQueryData<TacticSummary[]>(queryKeys.tactics, (list) => (
    list?.map((tactic) => ({
      ...tactic,
      groups: (tactic.groups ?? []).map((item) => item.id === group.id ? { ...item, name: group.name } : item),
    }))
  ));
  queryClient.setQueriesData<TacticDetail>({ queryKey: ["tactics", "detail"] }, (tactic) => {
    if (!tactic) return tactic;
    return {
      ...tactic,
      groups: tactic.groups.map((item) => item.id === group.id ? { ...item, name: group.name } : item),
    };
  });
}

export function dropGroup(id: string) {
  queryClient.setQueryData<GroupSummary[]>(queryKeys.groups, (list) => (
    list?.filter((item) => item.id !== id)
  ));
  queryClient.setQueryData<TacticSummary[]>(queryKeys.tactics, (list) => (
    list?.map((tactic) => ({
      ...tactic,
      groups: (tactic.groups ?? []).filter((item) => item.id !== id),
    }))
  ));
  queryClient.setQueriesData<TacticDetail>({ queryKey: ["tactics", "detail"] }, (tactic) => {
    if (!tactic) return tactic;
    return {
      ...tactic,
      groupIds: tactic.groupIds.filter((groupId) => groupId !== id),
      groups: tactic.groups.filter((item) => item.id !== id),
    };
  });
}
