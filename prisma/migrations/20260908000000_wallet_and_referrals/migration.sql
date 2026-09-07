-- AlterTable
ALTER TABLE `order` ADD COLUMN `walletAmount` DECIMAL(18, 0) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `storesetting` ADD COLUMN `referralEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `referralRefereeReward` DECIMAL(18, 0) NOT NULL DEFAULT 300000,
    ADD COLUMN `referralReferrerReward` DECIMAL(18, 0) NOT NULL DEFAULT 500000,
    ADD COLUMN `referralRewardMinOrderAmount` DECIMAL(18, 0) NOT NULL DEFAULT 0,
    ADD COLUMN `walletCheckoutEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `walletEnabled` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `referralCode` VARCHAR(12) NULL;

-- CreateTable
CREATE TABLE `Wallet` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `balance` DECIMAL(18, 0) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Wallet_userId_key`(`userId`),
    INDEX `Wallet_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WalletTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `walletId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(18, 0) NOT NULL,
    `balanceAfter` DECIMAL(18, 0) NOT NULL,
    `type` ENUM('REFERRAL_REWARD', 'REFERRAL_BONUS', 'ORDER_PAYMENT', 'ORDER_REFUND', 'ADMIN_CREDIT', 'ADMIN_DEBIT') NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `actorId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WalletTransaction_walletId_createdAt_idx`(`walletId`, `createdAt`),
    INDEX `WalletTransaction_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Referral` (
    `id` VARCHAR(191) NOT NULL,
    `referrerId` VARCHAR(191) NOT NULL,
    `refereeId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(12) NOT NULL,
    `status` ENUM('PENDING', 'REWARDED') NOT NULL DEFAULT 'PENDING',
    `qualifyingOrderId` VARCHAR(191) NULL,
    `referrerReward` DECIMAL(18, 0) NOT NULL DEFAULT 0,
    `refereeReward` DECIMAL(18, 0) NOT NULL DEFAULT 0,
    `rewardedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Referral_refereeId_key`(`refereeId`),
    INDEX `Referral_referrerId_status_idx`(`referrerId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `User_referralCode_key` ON `User`(`referralCode`);

-- AddForeignKey
ALTER TABLE `Wallet` ADD CONSTRAINT `Wallet_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WalletTransaction` ADD CONSTRAINT `WalletTransaction_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `Wallet`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WalletTransaction` ADD CONSTRAINT `WalletTransaction_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Referral` ADD CONSTRAINT `Referral_referrerId_fkey` FOREIGN KEY (`referrerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Referral` ADD CONSTRAINT `Referral_refereeId_fkey` FOREIGN KEY (`refereeId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Referral` ADD CONSTRAINT `Referral_qualifyingOrderId_fkey` FOREIGN KEY (`qualifyingOrderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

