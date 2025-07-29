/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Server` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[domain]` on the table `Server` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Channel_serverId_idx";

-- AlterTable
ALTER TABLE "Server" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "domain" TEXT;

-- CreateIndex
CREATE INDEX "Channel_serverId_createdAt_idx" ON "Channel"("serverId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Server_name_key" ON "Server"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Server_domain_key" ON "Server"("domain");
