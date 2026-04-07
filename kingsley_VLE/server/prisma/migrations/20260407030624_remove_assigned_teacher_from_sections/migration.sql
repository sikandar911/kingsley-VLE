-- DropForeignKey
ALTER TABLE "sections" DROP CONSTRAINT "sections_assigned_teacher_id_fkey";

-- DropColumn
ALTER TABLE "sections" DROP COLUMN "assigned_teacher_id";
