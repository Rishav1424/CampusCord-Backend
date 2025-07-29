/*
  Warnings:

  - You are about to drop the column `moderator` on the `Membership` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Membership" DROP COLUMN "moderator",
ADD COLUMN     "admin" BOOLEAN NOT NULL DEFAULT false;
