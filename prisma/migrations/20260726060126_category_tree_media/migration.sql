-- AlterTable
ALTER TABLE `category` ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `featured` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `imageId` VARCHAR(191) NULL,
    ADD COLUMN `sortOrder` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `Category_imageId_idx` ON `Category`(`imageId`);

-- CreateIndex
CREATE INDEX `Category_isActive_featured_sortOrder_idx` ON `Category`(`isActive`, `featured`, `sortOrder`);

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_imageId_fkey` FOREIGN KEY (`imageId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
