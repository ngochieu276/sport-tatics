ALTER TABLE "snapshots" ADD COLUMN "parent_id" TEXT;

UPDATE "snapshots" AS child
SET "parent_id" = parent."id"
FROM "snapshots" AS parent
WHERE child."tactic_id" = parent."tactic_id"
  AND child."position" = parent."position" + 1;
