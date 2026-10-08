import { useMutation, useQuery } from "@tanstack/react-query";
import type { GroupSummary } from "@/domain/types";
import { api } from "@/lib/api";
import { cacheGroup, dropGroup, queryKeys, renameCachedGroup } from "@/lib/query";

export function useGroups(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.groups,
    queryFn: async ({ signal }) => (await api<{ groups: GroupSummary[] }>("/api/groups", { signal })).groups,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateGroup() {
  return useMutation({
    mutationFn: async (name: string) => {
      const result = await api<{ group: GroupSummary }>("/api/groups", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      return result.group;
    },
    onSuccess: (group) => {
      cacheGroup(group);
    },
  });
}

export function useRenameGroup() {
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const result = await api<{ group: GroupSummary }>(`/api/groups/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      return result.group;
    },
    onSuccess: (group) => {
      renameCachedGroup(group);
    },
  });
}

export function useDeleteGroup() {
  return useMutation({
    mutationFn: async (id: string) => {
      await api(`/api/groups/${id}`, { method: "DELETE" });
      return id;
    },
    onSuccess: (id) => {
      dropGroup(id);
    },
  });
}
