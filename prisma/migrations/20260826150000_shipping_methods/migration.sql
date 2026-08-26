-- Where parcels ship from, and what to weigh a product that has no packaged weight yet.
ALTER TABLE `StoreSetting`
  ADD COLUMN `originProvinceId` VARCHAR(191) NULL,
  ADD COLUMN `originCityId` VARCHAR(191) NULL,
  ADD COLUMN `defaultParcelWeightGrams` INTEGER NOT NULL DEFAULT 500;

CREATE TABLE `ShippingMethod` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `carrier` VARCHAR(40) NOT NULL,
  `rateType` VARCHAR(40) NULL,
  `source` VARCHAR(20) NOT NULL DEFAULT 'TABLE',
  `orderType` INTEGER NOT NULL DEFAULT 1,
  `estimatedDays` INTEGER NOT NULL DEFAULT 3,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `ShippingMethod_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ShippingZoneRate` (
  `id` VARCHAR(191) NOT NULL,
  `methodId` VARCHAR(191) NOT NULL,
  `provinceId` VARCHAR(191) NULL,
  `maxWeightGrams` INTEGER NOT NULL,
  `price` DECIMAL(18, 0) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `ShippingZoneRate_methodId_provinceId_maxWeightGrams_idx`(`methodId`, `provinceId`, `maxWeightGrams`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- The chosen method and its name, snapshotted so a later rename cannot rewrite an old invoice.
ALTER TABLE `Order`
  ADD COLUMN `shippingMethodId` VARCHAR(191) NULL,
  ADD COLUMN `shippingMethodTitle` VARCHAR(100) NULL;

ALTER TABLE `StoreSetting` ADD CONSTRAINT `StoreSetting_originProvinceId_fkey` FOREIGN KEY (`originProvinceId`) REFERENCES `Province`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `StoreSetting` ADD CONSTRAINT `StoreSetting_originCityId_fkey` FOREIGN KEY (`originCityId`) REFERENCES `City`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ShippingZoneRate` ADD CONSTRAINT `ShippingZoneRate_methodId_fkey` FOREIGN KEY (`methodId`) REFERENCES `ShippingMethod`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ShippingZoneRate` ADD CONSTRAINT `ShippingZoneRate_provinceId_fkey` FOREIGN KEY (`provinceId`) REFERENCES `Province`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Order` ADD CONSTRAINT `Order_shippingMethodId_fkey` FOREIGN KEY (`shippingMethodId`) REFERENCES `ShippingMethod`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
