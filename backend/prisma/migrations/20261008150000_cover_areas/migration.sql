UPDATE "snapshots"
SET "cover_area" = CASE
  WHEN jsonb_typeof("cover_area") = 'array' THEN "cover_area"
  WHEN jsonb_typeof("cover_area") = 'object' THEN jsonb_build_array(
    "cover_area" || jsonb_build_object('id', gen_random_uuid()::text)
  )
  ELSE '[]'::jsonb
END;

ALTER TABLE "snapshots" ALTER COLUMN "cover_area" SET DEFAULT '[]';
