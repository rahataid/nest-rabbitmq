/*
  Warnings:

  - You are about to drop the column `phone` on the `beneficiaries` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "beneficiaries_phone_key";

-- AlterTable
ALTER TABLE "beneficiaries" DROP COLUMN "phone";
