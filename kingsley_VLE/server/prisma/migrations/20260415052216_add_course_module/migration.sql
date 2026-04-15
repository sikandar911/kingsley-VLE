-- CreateEnum
CREATE TYPE "CourseModuleStatus" AS ENUM ('active', 'inactive');

-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "course_module_id" TEXT;

-- AlterTable
ALTER TABLE "class_materials" ADD COLUMN     "course_module_id" TEXT;

-- AlterTable
ALTER TABLE "class_records" ADD COLUMN     "course_module_id" TEXT;

-- CreateTable
CREATE TABLE "course_modules" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "CourseModuleStatus" NOT NULL DEFAULT 'active',
    "course_id" TEXT NOT NULL,
    "section_id" TEXT,
    "semester_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_modules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_modules_course_id_status_idx" ON "course_modules"("course_id", "status");

-- CreateIndex
CREATE INDEX "course_modules_course_id_section_id_idx" ON "course_modules"("course_id", "section_id");

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_course_module_id_fkey" FOREIGN KEY ("course_module_id") REFERENCES "course_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_materials" ADD CONSTRAINT "class_materials_course_module_id_fkey" FOREIGN KEY ("course_module_id") REFERENCES "course_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_records" ADD CONSTRAINT "class_records_course_module_id_fkey" FOREIGN KEY ("course_module_id") REFERENCES "course_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
