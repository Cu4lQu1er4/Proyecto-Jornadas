/*
  Warnings:

  - You are about to drop the column `failedPinAttemps` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "failedPinAttemps",
ADD COLUMN     "failedPinAttempts" INTEGER NOT NULL DEFAULT 0;
