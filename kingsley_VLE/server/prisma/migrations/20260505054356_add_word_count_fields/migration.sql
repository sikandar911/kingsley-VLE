-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "required_word_count" INTEGER;

-- AlterTable
ALTER TABLE "submission_attempts" ADD COLUMN     "word_count" INTEGER;
