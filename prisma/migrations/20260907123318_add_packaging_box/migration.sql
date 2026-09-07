-- CreateTable
CREATE TABLE `PackagingBox` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `lengthCm` DECIMAL(8, 2) NOT NULL,
    `widthCm` DECIMAL(8, 2) NOT NULL,
    `heightCm` DECIMAL(8, 2) NOT NULL,
    `weightGrams` INTEGER NOT NULL,
    `maxWeightGrams` INTEGER NOT NULL,
    `tapinBoxId` INTEGER NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PackagingBox_isActive_idx`(`isActive`),
    INDEX `PackagingBox_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
