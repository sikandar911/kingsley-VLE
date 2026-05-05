/*
  Warnings:

  - You are about to drop the column `attempt_number` on the `assignment_submissions` table. All the data in the column will be lost.
  - You are about to drop the column `feedback` on the `assignment_submissions` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `assignment_submissions` table. All the data in the column will be lost.
  - You are about to drop the column `submissionFileId` on the `assignment_submissions` table. All the data in the column will be lost.
  - You are about to drop the column `submission_file_ids` on the `assignment_submissions` table. All the data in the column will be lost.
  - You are about to drop the column `submission_file_url` on the `assignment_submissions` table. All the data in the column will be lost.
  - You are about to drop the column `submission_text` on the `assignment_submissions` table. All the data in the column will be lost.
  - You are about to drop the column `submitted_at` on the `assignment_submissions` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "IqaStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'IQA_PASSED', 'IQA_FAILED');

-- CreateEnum
CREATE TYPE "EqaStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING_STUDENT_CONFIRMATION', 'CONFIRMED', 'LOCKED');

-- DropForeignKey
ALTER TABLE "assignment_submissions" DROP CONSTRAINT "assignment_submissions_submissionFileId_fkey";

-- DropIndex
DROP INDEX "assignment_submissions_assignmentId_status_idx";

-- AlterTable
ALTER TABLE "assignment_submissions" DROP COLUMN "attempt_number",
DROP COLUMN "feedback",
DROP COLUMN "status",
DROP COLUMN "submissionFileId",
DROP COLUMN "submission_file_ids",
DROP COLUMN "submission_file_url",
DROP COLUMN "submission_text",
DROP COLUMN "submitted_at",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "eqa_status" "EqaStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
ADD COLUMN     "final_qualified_attempt_id" TEXT,
ADD COLUMN     "iqa_status" "IqaStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "assignments" ALTER COLUMN "total_marks" DROP NOT NULL,
ALTER COLUMN "total_marks" DROP DEFAULT;

-- CreateTable
CREATE TABLE "submission_attempts" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "submission_text" TEXT,
    "submission_file_id" TEXT,
    "submission_file_ids" TEXT,
    "submission_file_url" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'submitted',
    "feedback" TEXT,
    "is_qualified_for_eqa" BOOLEAN NOT NULL DEFAULT false,
    "student_select" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "submission_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submission_attempts_submission_id_idx" ON "submission_attempts"("submission_id");

-- AddForeignKey
ALTER TABLE "submission_attempts" ADD CONSTRAINT "submission_attempts_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "assignment_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_attempts" ADD CONSTRAINT "submission_attempts_submission_file_id_fkey" FOREIGN KEY ("submission_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
