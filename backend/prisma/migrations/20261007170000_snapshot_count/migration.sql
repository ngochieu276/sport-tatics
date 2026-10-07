ALTER TABLE "tactics" ADD COLUMN "snapshot_count" INTEGER NOT NULL DEFAULT 0;

UPDATE "tactics" SET "snapshot_count" = (
  SELECT COUNT(*) FROM "snapshots" WHERE "snapshots"."tactic_id" = "tactics"."id"
);
