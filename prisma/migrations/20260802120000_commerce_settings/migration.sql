ALTER TABLE `StoreSetting`
    ADD COLUMN `onlinePaymentEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `freeShippingThreshold` DECIMAL(18, 0) NULL DEFAULT 100000000,
    ADD COLUMN `preparationDays` INTEGER NOT NULL DEFAULT 2,
    ADD COLUMN `insuredShippingEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `inStorePickupEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `calculateShippingAfterAddress` BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE `Order`
    ADD COLUMN `deliveryMethod` ENUM('INSURED_SHIPPING', 'STORE_PICKUP') NOT NULL DEFAULT 'INSURED_SHIPPING',
    ADD COLUMN `preparationDaysSnapshot` INTEGER NOT NULL DEFAULT 2,
    ADD COLUMN `estimatedReadyAt` DATETIME(3) NULL;
