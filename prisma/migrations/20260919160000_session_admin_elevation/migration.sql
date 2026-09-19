-- AlterTable
ALTER TABLE `Session` ADD COLUMN `adminSince` DATETIME(3) NULL,
    ADD COLUMN `adminUntil` DATETIME(3) NULL;
