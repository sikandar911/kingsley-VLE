-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');

-- AlterTable
ALTER TABLE "sections" ADD COLUMN     "dayOfWeek" "DayOfWeek",
ADD COLUMN     "endTime" VARCHAR(5),
ADD COLUMN     "startTime" VARCHAR(5);
