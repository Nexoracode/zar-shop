-- AlterTable
ALTER TABLE `Promotion`
    ADD COLUMN `itemScope` VARCHAR(20) NOT NULL DEFAULT 'ALL',
    ADD COLUMN `targetProductIds` JSON NULL,
    ADD COLUMN `targetCategoryIds` JSON NULL,
    ADD COLUMN `audienceScope` VARCHAR(20) NOT NULL DEFAULT 'ALL',
    ADD COLUMN `targetUserIds` JSON NULL;

-- AlterTable
ALTER TABLE `PromotionReward`
    ADD COLUMN `itemScope` VARCHAR(20) NOT NULL DEFAULT 'ALL',
    ADD COLUMN `targetProductIds` JSON NULL,
    ADD COLUMN `targetCategoryIds` JSON NULL;
