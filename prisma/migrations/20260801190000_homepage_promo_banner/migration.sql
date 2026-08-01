ALTER TABLE `StoreSetting`
    ADD COLUMN `promoBannerEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `promoBannerHref` VARCHAR(500) NULL,
    ADD COLUMN `promoDesktopMediaId` VARCHAR(191) NULL,
    ADD COLUMN `promoMobileMediaId` VARCHAR(191) NULL;

CREATE INDEX `StoreSetting_promoDesktopMediaId_idx` ON `StoreSetting`(`promoDesktopMediaId`);
CREATE INDEX `StoreSetting_promoMobileMediaId_idx` ON `StoreSetting`(`promoMobileMediaId`);

ALTER TABLE `StoreSetting`
    ADD CONSTRAINT `StoreSetting_promoDesktopMediaId_fkey` FOREIGN KEY (`promoDesktopMediaId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `StoreSetting_promoMobileMediaId_fkey` FOREIGN KEY (`promoMobileMediaId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
