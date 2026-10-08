import { z } from "zod";
import {
  FORMATS,
  PLAYER_SLOTS,
  SHOT_TYPES,
  type Format,
  type Snapshot,
} from "./badminton.js";

export const formatSchema = z.enum(FORMATS);
export const playerSlotSchema = z.enum(PLAYER_SLOTS);
export const shotTypeSchema = z.enum(SHOT_TYPES);

export const pointSchema = z.object({
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1),
});

export const playerStateSchema = z.object({
  id: playerSlotSchema,
  x: pointSchema.shape.x,
  y: pointSchema.shape.y,
});

export const boundsSchema = z.object({
  x0: z.number().finite().min(0).max(1),
  x1: z.number().finite().min(0).max(1),
  y0: z.number().finite().min(0).max(1),
  y1: z.number().finite().min(0).max(1),
});

export const coverAreaSchema = boundsSchema.extend({
  id: z.string().uuid(),
});

export const branchKindSchema = z.enum(["follow", "option"]);

export const snapshotSchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  kind: branchKindSchema.nullable(),
  players: z.array(playerStateSchema).min(2).max(4),
  shot: z.object({
    hitterId: playerSlotSchema,
    type: shotTypeSchema,
    target: pointSchema,
  }),
  coverAreas: z.array(coverAreaSchema).max(8, "A rally can hold 8 cover areas"),
});

export const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

const tagSchema = z.string().trim().min(1, "Tags cannot be empty").max(24, "Tags must be 24 characters or fewer");

export const groupNameSchema = z.string().trim().min(1, "Add a group name").max(40, "Group names must be 40 characters or fewer");

export const groupCreateSchema = z.object({
  name: groupNameSchema,
});

export const groupPatchSchema = z.object({
  name: groupNameSchema,
});

export const tacticCreateSchema = z.object({
  title: z.string().trim().min(1, "Add a title").max(80, "Titles must be 80 characters or fewer"),
  format: formatSchema,
  notes: z.string().max(2000, "Notes must be 2000 characters or fewer").optional(),
  tags: z.array(tagSchema).max(8, "Use up to 8 tags").optional(),
  groupIds: z.array(z.string().uuid()).max(8, "A tactic can belong to 8 groups").optional(),
});

export const tacticPatchSchema = z.object({
  title: z.string().trim().min(1, "Add a title").max(80, "Titles must be 80 characters or fewer").optional(),
  notes: z.string().max(2000, "Notes must be 2000 characters or fewer").optional(),
  tags: z.array(tagSchema).max(8, "Use up to 8 tags").optional(),
  snapshots: z.array(snapshotSchema).min(1, "A tactic needs at least one rally").max(40, "A tactic can hold 40 rallies").optional(),
  groupIds: z.array(z.string().uuid()).max(8, "A tactic can belong to 8 groups").optional(),
}).refine(
  (value) =>
    value.title !== undefined ||
    value.notes !== undefined ||
    value.tags !== undefined ||
    value.snapshots !== undefined ||
    value.groupIds !== undefined,
  { message: "Nothing to update" },
);

export const tacticQuerySchema = z.object({
  format: z.union([formatSchema, z.literal("")]).optional(),
  q: z.string().max(80).optional(),
  groupId: z.union([z.string().uuid(), z.literal("")]).optional(),
});

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
