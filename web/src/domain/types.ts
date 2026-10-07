import type { Format, Snapshot } from "./badminton";

export type TacticDraft = {
  title: string;
  notes: string;
  tags: string[];
  snapshots: Snapshot[];
};

export type TacticDetail = TacticDraft & {
  id: string;
  sport: "badminton";
  format: Format;
  createdAt: string;
  updatedAt: string;
};

export type TacticSummary = {
  id: string;
  format: Format;
  title: string;
  notes: string;
  tags: string[];
  snapshotCount: number;
  createdAt: string;
  updatedAt: string;
};

export type UserProfile = {
  id: string;
  email: string;
};
