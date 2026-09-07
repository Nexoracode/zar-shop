-- AlterTable
ALTER TABLE `storesetting` ADD COLUMN `walletMaxTopup` DECIMAL(18, 0) NOT NULL DEFAULT 50000000,
    ADD COLUMN `walletMinTopup` DECIMAL(18, 0) NOT NULL DEFAULT 50000,
    ADD COLUMN `walletTopupEnabled` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `wallettransaction` MODIFY `type` ENUM('REFERRAL_REWARD', 'REFERRAL_BONUS', 'ORDER_PAYMENT', 'ORDER_REFUND', 'ADMIN_CREDIT', 'ADMIN_DEBIT', 'TOPUP') NOT NULL;

-- CreateTable
CREATE TABLE `WalletTopup` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(18, 0) NOT NULL,
    `provider` VARCHAR(50) NOT NULL,
    `authority` VARCHAR(191) NULL,
    `referenceId` VARCHAR(191) NULL,
    `status` ENUM('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'INITIATED',
    `providerData` JSON NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WalletTopup_authority_key`(`authority`),
    UNIQUE INDEX `WalletTopup_referenceId_key`(`referenceId`),
    INDEX `WalletTopup_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WalletTopup` ADD CONSTRAINT `WalletTopup_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

