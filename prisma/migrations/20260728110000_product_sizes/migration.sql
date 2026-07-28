-- AlterTable
ALTER TABLE `MediaAsset` MODIFY `type` ENUM('IMAGE', 'VIDEO', 'DOCUMENT') NOT NULL;

-- AlterTable
ALTER TABLE `Product` ADD COLUMN `sizeGuideId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `CartItem`
    DROP PRIMARY KEY,
    ADD COLUMN `selectedSize` VARCHAR(50) NOT NULL DEFAULT '',
    ADD PRIMARY KEY (`cartId`, `productId`, `selectedSize`);

-- AlterTable
ALTER TABLE `OrderItem` ADD COLUMN `selectedSize` VARCHAR(50) NULL;

-- CreateTable
CREATE TABLE `ProductSize` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(50) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `ProductSize_productId_label_key`(`productId`, `label`),
    INDEX `ProductSize_productId_position_idx`(`productId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Product_sizeGuideId_idx` ON `Product`(`sizeGuideId`);

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_sizeGuideId_fkey` FOREIGN KEY (`sizeGuideId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductSize` ADD CONSTRAINT `ProductSize_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
