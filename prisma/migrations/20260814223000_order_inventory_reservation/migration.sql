ALTER TABLE `Order`
    ADD COLUMN `inventoryReserved` BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE `AuthRateLimit` (
    `keyHash` CHAR(64) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `windowStartedAt` DATETIME(3) NOT NULL,
    `blockedUntil` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `AuthRateLimit_blockedUntil_idx`(`blockedUntil`),
    INDEX `AuthRateLimit_updatedAt_idx`(`updatedAt`),
    PRIMARY KEY (`keyHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
