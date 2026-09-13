-- AlterTable
ALTER TABLE `Article` ADD COLUMN `ratingAverage` DECIMAL(3, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `ratingCount` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `ArticleRating` (
    `id` VARCHAR(191) NOT NULL,
    `articleId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `value` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ArticleRating_articleId_idx`(`articleId`),
    UNIQUE INDEX `ArticleRating_articleId_userId_key`(`articleId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ArticleRating` ADD CONSTRAINT `ArticleRating_articleId_fkey` FOREIGN KEY (`articleId`) REFERENCES `Article`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArticleRating` ADD CONSTRAINT `ArticleRating_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
