-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `returnOrigin` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `WalletTopup` ADD COLUMN `returnOrigin` VARCHAR(255) NULL;
