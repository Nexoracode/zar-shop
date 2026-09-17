-- AlterTable
ALTER TABLE `Return` ADD COLUMN `refundAmount` DECIMAL(18, 0) NULL,
    ADD COLUMN `refundCardHolder` VARCHAR(120) NULL,
    ADD COLUMN `refundCardNumber` VARCHAR(16) NULL,
    ADD COLUMN `refundCardSheba` VARCHAR(24) NULL,
    ADD COLUMN `refundMethod` ENUM('WALLET', 'BANK_CARD') NOT NULL DEFAULT 'WALLET',
    ADD COLUMN `refundedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `bankCardHolder` VARCHAR(120) NULL,
    ADD COLUMN `bankCardNumber` VARCHAR(16) NULL,
    ADD COLUMN `bankCardSheba` VARCHAR(24) NULL,
    ADD COLUMN `refundMethod` ENUM('WALLET', 'BANK_CARD') NOT NULL DEFAULT 'WALLET';
