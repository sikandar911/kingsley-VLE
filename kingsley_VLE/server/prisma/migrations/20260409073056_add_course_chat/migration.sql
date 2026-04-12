-- CreateEnum
CREATE TYPE "ChatReactionType" AS ENUM ('like', 'unlike', 'love', 'ok', 'done');

-- CreateTable
CREATE TABLE "course_messages" (
    "id" TEXT NOT NULL,
    "content" TEXT,
    "courseId" TEXT NOT NULL,
    "section_id" TEXT,
    "user_id" TEXT NOT NULL,
    "class_material_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "course_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_message_reactions" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "ChatReactionType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_message_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_messages_class_material_id_key" ON "course_messages"("class_material_id");

-- CreateIndex
CREATE INDEX "course_messages_courseId_section_id_created_at_idx" ON "course_messages"("courseId", "section_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "course_message_reactions_message_id_user_id_key" ON "course_message_reactions"("message_id", "user_id");

-- AddForeignKey
ALTER TABLE "course_messages" ADD CONSTRAINT "course_messages_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_messages" ADD CONSTRAINT "course_messages_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_messages" ADD CONSTRAINT "course_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_messages" ADD CONSTRAINT "course_messages_class_material_id_fkey" FOREIGN KEY ("class_material_id") REFERENCES "class_materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_message_reactions" ADD CONSTRAINT "course_message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "course_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_message_reactions" ADD CONSTRAINT "course_message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
