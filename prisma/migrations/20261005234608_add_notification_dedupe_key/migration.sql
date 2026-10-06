/*
  Warnings:

  - A unique constraint covering the columns `[dedupeKey]` on the table `Notification` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dedupeKey` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "dedupeKey" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
