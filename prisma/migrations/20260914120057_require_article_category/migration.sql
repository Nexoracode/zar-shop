/*
  Warnings:

  - Made the column `categoryId` on table `article` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `article` DROP FOREIGN KEY `Article_categoryId_fkey`;

-- AlterTable
ALTER TABLE `article` MODIFY `categoryId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `Article` ADD CONSTRAINT `Article_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ArticleCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
