-- DropForeignKey
ALTER TABLE "class_materials" DROP CONSTRAINT "class_materials_fileId_fkey";

-- AlterTable
ALTER TABLE "class_materials" ADD COLUMN     "fileUrl" TEXT,
ALTER COLUMN "fileId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "class_materials" ADD CONSTRAINT "class_materials_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
