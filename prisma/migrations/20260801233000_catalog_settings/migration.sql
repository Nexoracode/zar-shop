ALTER TABLE `StoreSetting`
    ADD COLUMN `catalogLowStockThreshold` INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN `catalogPageSize` INTEGER NOT NULL DEFAULT 24,
    ADD COLUMN `hideOutOfStockProducts` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `showProductStock` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `goldPriceRefreshSeconds` INTEGER NOT NULL DEFAULT 60,
    ADD COLUMN `goldPriceCacheSeconds` INTEGER NOT NULL DEFAULT 120,
    ADD COLUMN `goldPriceFallbackMinutes` INTEGER NOT NULL DEFAULT 15;
