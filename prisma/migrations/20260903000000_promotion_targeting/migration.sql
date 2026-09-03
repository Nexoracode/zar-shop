-- AlterTable
ALTER TABLE `promotion`
    ADD COLUMN `itemScope` VARCHAR(20) NOT NULL DEFAULT 'ALL',
    ADD COLUMN `targetProductIds` JSON NULL,
    ADD COLUMN `targetCategoryIds` JSON NULL,
    ADD COLUMN `audienceScope` VARCHAR(20) NOT NULL DEFAULT 'ALL',
    ADD COLUMN `targetUserIds` JSON NULL;

-- AlterTable
ALTER TABLE `promotionreward`
    ADD COLUMN `itemScope` VARCHAR(20) NOT NULL DEFAULT 'ALL',
    ADD COLUMN `targetProductIds` JSON NULL,
    ADD COLUMN `targetCategoryIds` JSON NULL;
