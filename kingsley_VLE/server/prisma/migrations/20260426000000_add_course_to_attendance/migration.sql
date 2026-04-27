-- AddForeignKey
ALTER TABLE "attendance" ADD COLUMN "courseId" TEXT;

-- Add constraint to link attendance to course
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
