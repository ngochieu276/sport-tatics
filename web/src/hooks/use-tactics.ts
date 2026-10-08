import { useMutation, useQuery } from "@tanstack/react-query";
import type { Format } from "@/domain/badminton";
import type { TacticDetail, TacticSummary } from "@/domain/types";
import { api } from "@/lib/api";
import { cacheTactic, dropTactic, queryKeys } from "@/lib/query";

export function useTactics() {
  return useQuery({
    queryKey: queryKeys.tactics,
    queryFn: async ({ signal }) => (await api<{ tactics: TacticSummary[] }>("/api/tactics", { signal })).tactics,
  });
}

export function useTactic(id: string) {
  return useQuery({
    queryKey: queryKeys.tactic(id),
    queryFn: async ({ signal }) => (await api<{ tactic: TacticDetail }>(`/api/tactics/${id}`, { signal })).tactic,
    enabled: Boolean(id),
  });
}

export function useCreateTactic() {
  return useMutation({
    mutationFn: async (input: { title: string; format: Format; groupIds?: string[] }) => {
      const result = await api<{ tactic: TacticDetail }>("/api/tactics", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return result.tactic;
    },
    onSuccess: (tactic) => {
      cacheTactic(tactic);
    },
  });
}

export function usePatchTactic() {
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      title?: string;
      notes?: string;
      tags?: string[];
      groupIds?: string[];
    }) => {
      const result = await api<{ tactic: TacticDetail }>(`/api/tactics/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      return result.tactic;
    },
    onSuccess: (tactic) => {
      cacheTactic(tactic);
    },
  });
}

export function useDeleteTactic() {
  return useMutation({
    mutationFn: async (id: string) => {
      await api(`/api/tactics/${id}`, { method: "DELETE" });
      return id;
    },
    onSuccess: (id) => {
      dropTactic(id);
    },
  });
}
