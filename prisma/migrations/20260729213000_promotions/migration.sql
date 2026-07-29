ALTER TABLE `StoreSetting`
    ADD COLUMN `defaultShippingFee` DECIMAL(18, 0) NOT NULL DEFAULT 0;

ALTER TABLE `Order`
    ADD COLUMN `productDiscount` DECIMAL(18, 0) NOT NULL DEFAULT 0,
    ADD COLUMN `promotionDiscount` DECIMAL(18, 0) NOT NULL DEFAULT 0,
    ADD COLUMN `shippingDiscount` DECIMAL(18, 0) NOT NULL DEFAULT 0;

UPDATE `Order` SET `productDiscount` = `discount`;

CREATE TABLE `Promotion` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `type` ENUM('COUPON', 'FREE_SHIPPING', 'NEXT_PURCHASE', 'FIRST_PURCHASE') NOT NULL,
    `code` VARCHAR(64) NULL,
    `discountType` ENUM('PERCENT', 'FIXED') NULL,
    `discountValue` DECIMAL(18, 3) NULL,
    `minOrderAmount` DECIMAL(18, 0) NULL,
    `maxDiscountAmount` DECIMAL(18, 0) NULL,
    `usageLimit` INTEGER NULL,
    `perUserLimit` INTEGER NOT NULL DEFAULT 1,
    `rewardExpiresDays` INTEGER NULL,
    `shippingScope` VARCHAR(30) NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `Promotion_code_key`(`code`),
    INDEX `Promotion_type_isActive_startsAt_endsAt_idx`(`type`, `isActive`, `startsAt`, `endsAt`),
    INDEX `Promotion_isActive_endsAt_idx`(`isActive`, `endsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PromotionRedemption` (
    `id` VARCHAR(191) NOT NULL,
    `promotionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `discountAmount` DECIMAL(18, 0) NOT NULL DEFAULT 0,
    `shippingDiscount` DECIMAL(18, 0) NOT NULL DEFAULT 0,
    `snapshot` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `PromotionRedemption_promotionId_orderId_key`(`promotionId`, `orderId`),
    INDEX `PromotionRedemption_promotionId_userId_createdAt_idx`(`promotionId`, `userId`, `createdAt`),
    INDEX `PromotionRedemption_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PromotionReward` (
    `id` VARCHAR(191) NOT NULL,
    `promotionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `sourceOrderId` VARCHAR(191) NOT NULL,
    `redeemedOrderId` VARCHAR(191) NULL,
    `discountType` ENUM('PERCENT', 'FIXED') NOT NULL,
    `discountValue` DECIMAL(18, 3) NOT NULL,
    `maxDiscountAmount` DECIMAL(18, 0) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `redeemedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `PromotionReward_promotionId_sourceOrderId_key`(`promotionId`, `sourceOrderId`),
    INDEX `PromotionReward_userId_redeemedAt_expiresAt_idx`(`userId`, `redeemedAt`, `expiresAt`),
    INDEX `PromotionReward_redeemedOrderId_idx`(`redeemedOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PromotionRedemption` ADD CONSTRAINT `PromotionRedemption_promotionId_fkey` FOREIGN KEY (`promotionId`) REFERENCES `Promotion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `PromotionRedemption` ADD CONSTRAINT `PromotionRedemption_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `PromotionRedemption` ADD CONSTRAINT `PromotionRedemption_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PromotionReward` ADD CONSTRAINT `PromotionReward_promotionId_fkey` FOREIGN KEY (`promotionId`) REFERENCES `Promotion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `PromotionReward` ADD CONSTRAINT `PromotionReward_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `PromotionReward` ADD CONSTRAINT `PromotionReward_sourceOrderId_fkey` FOREIGN KEY (`sourceOrderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `PromotionReward` ADD CONSTRAINT `PromotionReward_redeemedOrderId_fkey` FOREIGN KEY (`redeemedOrderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
