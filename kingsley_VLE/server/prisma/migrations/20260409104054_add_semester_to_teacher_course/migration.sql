-- AlterTable
ALTER TABLE "teacher_courses" ADD COLUMN     "semesterId" TEXT;

-- AddForeignKey
ALTER TABLE "teacher_courses" ADD CONSTRAINT "teacher_courses_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "semesters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
