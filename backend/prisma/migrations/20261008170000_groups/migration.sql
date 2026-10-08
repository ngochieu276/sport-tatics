-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tactic_groups" (
    "tactic_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,

    CONSTRAINT "tactic_groups_pkey" PRIMARY KEY ("tactic_id","group_id")
);

-- CreateIndex
CREATE INDEX "groups_user_id_name_idx" ON "groups"("user_id", "name");

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tactic_groups" ADD CONSTRAINT "tactic_groups_tactic_id_fkey" FOREIGN KEY ("tactic_id") REFERENCES "tactics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tactic_groups" ADD CONSTRAINT "tactic_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
