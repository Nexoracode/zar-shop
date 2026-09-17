-- AlterTable
ALTER TABLE `StoreSetting` ADD COLUMN `seoSettings` JSON NULL;

-- CreateTable
CREATE TABLE `SeoNoindex` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SeoNoindex_url_key`(`url`),
    INDEX `SeoNoindex_url_idx`(`url`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SeoGonePage` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SeoGonePage_url_key`(`url`),
    INDEX `SeoGonePage_url_idx`(`url`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SeoCanonical` (
    `id` VARCHAR(191) NOT NULL,
    `sourceUrl` VARCHAR(500) NOT NULL,
    `targetUrl` VARCHAR(500) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SeoCanonical_sourceUrl_key`(`sourceUrl`),
    INDEX `SeoCanonical_sourceUrl_idx`(`sourceUrl`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SeoRedirect` (
    `id` VARCHAR(191) NOT NULL,
    `fromUrl` VARCHAR(500) NOT NULL,
    `toUrl` VARCHAR(500) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SeoRedirect_fromUrl_key`(`fromUrl`),
    INDEX `SeoRedirect_fromUrl_idx`(`fromUrl`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
