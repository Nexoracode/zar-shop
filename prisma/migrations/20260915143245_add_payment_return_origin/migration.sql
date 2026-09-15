-- AlterTable
ALTER TABLE `payment` ADD COLUMN `returnOrigin` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `wallettopup` ADD COLUMN `returnOrigin` VARCHAR(255) NULL;
