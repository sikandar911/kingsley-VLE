/*
  Warnings:

  - You are about to drop the column `dayOfWeek` on the `sections` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "sections" DROP COLUMN "dayOfWeek",
ADD COLUMN     "daysOfWeek" VARCHAR(255);
