-- Preparation time and order limits belong to the combination that is actually sold, like stock,
-- price and discount already do. The product's own columns of the same name become a mirror.
-- AlterTable
ALTER TABLE `ProductVariant` ADD COLUMN `preparationDays` INTEGER NOT NULL DEFAULT 2,
    ADD COLUMN `minOrderQuantity` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `maxOrderQuantity` INTEGER NULL;
