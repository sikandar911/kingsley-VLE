-- AlterTable
ALTER TABLE "teacher_courses" ADD COLUMN     "sectionId" TEXT;

-- AddForeignKey
ALTER TABLE "teacher_courses" ADD CONSTRAINT "teacher_courses_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
