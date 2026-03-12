/*
  Warnings:

  - Added the required column `updated_at` to the `assignment_submissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teacherId` to the `assignments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `assignments` table without a default value. This is not possible if the table is not empty.
  - Made the column `courseId` on table `assignments` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updated_at` to the `courses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `sections` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('draft', 'published', 'closed');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('submitted', 'late', 'missing');

-- DropForeignKey
ALTER TABLE "assignments" DROP CONSTRAINT "assignments_courseId_fkey";

-- AlterTable
ALTER TABLE "assignment_submissions" ADD COLUMN     "attempt_number" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "grade_letter" VARCHAR(10),
ADD COLUMN     "status" "SubmissionStatus" NOT NULL DEFAULT 'submitted',
ADD COLUMN     "submission_file_url" TEXT,
ADD COLUMN     "submission_text" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "allow_late_submission" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passing_marks" INTEGER,
ADD COLUMN     "status" "AssignmentStatus" NOT NULL DEFAULT 'draft',
ADD COLUMN     "teacherId" TEXT NOT NULL,
ADD COLUMN     "total_marks" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "courseId" SET NOT NULL;

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "sections" ADD COLUMN     "assigned_teacher_id" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "assignment_rubrics" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "criteria" VARCHAR(200) NOT NULL,
    "max_marks" INTEGER NOT NULL,

    CONSTRAINT "assignment_rubrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assignment_submissions_assignmentId_studentId_idx" ON "assignment_submissions"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "assignment_submissions_assignmentId_status_idx" ON "assignment_submissions"("assignmentId", "status");

-- CreateIndex
CREATE INDEX "assignments_teacherId_status_idx" ON "assignments"("teacherId", "status");

-- CreateIndex
CREATE INDEX "assignments_courseId_sectionId_dueDate_idx" ON "assignments"("courseId", "sectionId", "dueDate");

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_assigned_teacher_id_fkey" FOREIGN KEY ("assigned_teacher_id") REFERENCES "teacher_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teacher_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_rubrics" ADD CONSTRAINT "assignment_rubrics_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
