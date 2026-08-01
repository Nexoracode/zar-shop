ALTER TABLE `StoreSetting`
    ADD COLUMN `orderExpirationEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `orderExpirationMinutes` INTEGER NOT NULL DEFAULT 15,
    ADD COLUMN `orderWarningMinutes` INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN `orderExpirationStart` ENUM('CREATED_AT', 'PAYMENT_STARTED_AT') NOT NULL DEFAULT 'CREATED_AT',
    ADD COLUMN `orderExpirationAction` ENUM('EXPIRE', 'CANCEL', 'NOTIFY') NOT NULL DEFAULT 'EXPIRE',
    ADD COLUMN `showOrderCountdown` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `releaseReservedInventory` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `restorePromotionOnExpiry` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `minimumOrderAmount` DECIMAL(18, 0) NOT NULL DEFAULT 5000000,
    ADD COLUMN `orderNumberPrefix` VARCHAR(10) NOT NULL DEFAULT 'ZG',
    ADD COLUMN `maxOrderItemQuantity` INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN `revalidateGoldAtCheckout` BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE `Order`
    MODIFY `status` ENUM('PENDING_PAYMENT', 'EXPIRED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING_PAYMENT',
    ADD COLUMN `expiresAt` DATETIME(3) NULL,
    ADD COLUMN `expiredAt` DATETIME(3) NULL,
    ADD COLUMN `expirationHandledAt` DATETIME(3) NULL;

CREATE INDEX `Order_status_expiresAt_idx` ON `Order`(`status`, `expiresAt`);
