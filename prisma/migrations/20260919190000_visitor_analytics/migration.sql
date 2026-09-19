-- CreateTable
CREATE TABLE `PageView` (
    `id` VARCHAR(191) NOT NULL,
    `visitorId` VARCHAR(32) NOT NULL,
    `path` VARCHAR(255) NOT NULL,
    `referrerHost` VARCHAR(120) NULL,
    `browser` VARCHAR(30) NOT NULL,
    `device` ENUM('MOBILE', 'DESKTOP', 'TABLET') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PageView_createdAt_idx`(`createdAt`),
    INDEX `PageView_visitorId_createdAt_idx`(`visitorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VisitorPresence` (
    `visitorId` VARCHAR(32) NOT NULL,
    `lastSeenAt` DATETIME(3) NOT NULL,

    INDEX `VisitorPresence_lastSeenAt_idx`(`lastSeenAt`),
    PRIMARY KEY (`visitorId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
