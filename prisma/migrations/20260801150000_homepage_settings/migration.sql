ALTER TABLE `StoreSetting`
    ADD COLUMN `homepageSections` JSON NULL,
    ADD COLUMN `heroTitle` VARCHAR(191) NOT NULL DEFAULT 'درخشش ماندگار، انتخابی مطمئن',
    ADD COLUMN `heroDescription` VARCHAR(500) NOT NULL DEFAULT 'جدیدترین زیورآلات طلا با قیمت لحظه‌ای',
    ADD COLUMN `heroButtonLabel` VARCHAR(80) NOT NULL DEFAULT 'مشاهده محصولات',
    ADD COLUMN `heroButtonHref` VARCHAR(500) NOT NULL DEFAULT '/products',
    ADD COLUMN `heroDesktopMediaId` VARCHAR(191) NULL,
    ADD COLUMN `heroMobileMediaId` VARCHAR(191) NULL;

CREATE INDEX `StoreSetting_heroDesktopMediaId_idx` ON `StoreSetting`(`heroDesktopMediaId`);
CREATE INDEX `StoreSetting_heroMobileMediaId_idx` ON `StoreSetting`(`heroMobileMediaId`);

ALTER TABLE `StoreSetting`
    ADD CONSTRAINT `StoreSetting_heroDesktopMediaId_fkey` FOREIGN KEY (`heroDesktopMediaId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `StoreSetting_heroMobileMediaId_fkey` FOREIGN KEY (`heroMobileMediaId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MediaAsset` MODIFY `scope` ENUM('CATEGORY', 'PRODUCT', 'HOMEPAGE') NOT NULL DEFAULT 'PRODUCT';
