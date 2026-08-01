ALTER TABLE `StoreSetting`
    ADD COLUMN `brandPrimaryColor` VARCHAR(7) NOT NULL DEFAULT '#1C3155',
    ADD COLUMN `brandAccentColor` VARCHAR(7) NOT NULL DEFAULT '#B5904C',
    ADD COLUMN `brandBackgroundColor` VARCHAR(7) NOT NULL DEFAULT '#F7F6F3',
    ADD COLUMN `brandDangerColor` VARCHAR(7) NOT NULL DEFAULT '#B8423A',
    ADD COLUMN `enforceColorContrast` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `stickyStoreHeader` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `compactMobileGrid` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `liveGoldPrice` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `mainLogoMediaId` VARCHAR(191) NULL,
    ADD COLUMN `darkLogoMediaId` VARCHAR(191) NULL,
    ADD COLUMN `faviconMediaId` VARCHAR(191) NULL,
    ADD COLUMN `socialImageMediaId` VARCHAR(191) NULL;

CREATE INDEX `StoreSetting_mainLogoMediaId_idx` ON `StoreSetting`(`mainLogoMediaId`);
CREATE INDEX `StoreSetting_darkLogoMediaId_idx` ON `StoreSetting`(`darkLogoMediaId`);
CREATE INDEX `StoreSetting_faviconMediaId_idx` ON `StoreSetting`(`faviconMediaId`);
CREATE INDEX `StoreSetting_socialImageMediaId_idx` ON `StoreSetting`(`socialImageMediaId`);

ALTER TABLE `StoreSetting`
    ADD CONSTRAINT `StoreSetting_mainLogoMediaId_fkey` FOREIGN KEY (`mainLogoMediaId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `StoreSetting_darkLogoMediaId_fkey` FOREIGN KEY (`darkLogoMediaId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `StoreSetting_faviconMediaId_fkey` FOREIGN KEY (`faviconMediaId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT `StoreSetting_socialImageMediaId_fkey` FOREIGN KEY (`socialImageMediaId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `MediaAsset` MODIFY `scope` ENUM('CATEGORY', 'PRODUCT', 'HOMEPAGE', 'BRAND') NOT NULL DEFAULT 'PRODUCT';
