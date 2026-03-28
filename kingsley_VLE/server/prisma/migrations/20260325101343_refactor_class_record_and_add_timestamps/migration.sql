/*
  Warnings:

  - You are about to drop the column `fileId` on the `class_records` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `class_materials` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `class_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `url` to the `class_records` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "class_materials" DROP CONSTRAINT "class_materials_courseId_fkey";

-- DropForeignKey
ALTER TABLE "class_records" DROP CONSTRAINT "class_records_courseId_fkey";

-- DropForeignKey
ALTER TABLE "class_records" DROP CONSTRAINT "class_records_fileId_fkey";

-- DropIndex
DROP INDEX "class_records_fileId_key";

-- AlterTable
ALTER TABLE "class_materials" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "class_records" DROP COLUMN "fileId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "url" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "class_materials" ADD CONSTRAINT "class_materials_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_records" ADD CONSTRAINT "class_records_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
