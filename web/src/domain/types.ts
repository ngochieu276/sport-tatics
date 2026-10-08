import type { Format, Snapshot } from "./badminton";

export type GroupSummary = {
  id: string;
  name: string;
  tacticCount: number;
  updatedAt: string;
};

export type TacticDraft = {
  title: string;
  notes: string;
  tags: string[];
  snapshots: Snapshot[];
  groupIds: string[];
};

export type TacticDetail = TacticDraft & {
  id: string;
  sport: "badminton";
  format: Format;
  groups: GroupSummary[];
  createdAt: string;
  updatedAt: string;
};

export type TacticSummary = {
  id: string;
  format: Format;
  title: string;
  tags: string[];
  groups: GroupSummary[];
  snapshotCount: number;
  updatedAt: string;
};

export type UserProfile = {
  id: string;
  email: string;
};
