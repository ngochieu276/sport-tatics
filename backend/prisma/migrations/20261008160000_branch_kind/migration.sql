ALTER TABLE "snapshots" ADD COLUMN "branch_kind" TEXT;

UPDATE "snapshots" SET "branch_kind" = 'option' WHERE "parent_id" IS NOT NULL;
