CREATE TABLE `PaymentGatewayConfig` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(40) NOT NULL,
    `displayName` VARCHAR(100) NOT NULL,
    `credentialEncrypted` TEXT NOT NULL,
    `credentialMasked` VARCHAR(80) NOT NULL,
    `isSandbox` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PaymentGatewayConfig_provider_key`(`provider`),
    INDEX `PaymentGatewayConfig_updatedAt_idx`(`updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
