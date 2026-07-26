-- AlterTable
ALTER TABLE `mediaasset` ADD COLUMN `scope` ENUM('CATEGORY', 'PRODUCT') NOT NULL DEFAULT 'PRODUCT';

-- Keep category images that existed before media scopes in the correct gallery.
UPDATE `MediaAsset`
INNER JOIN `Category` ON `Category`.`imageId` = `MediaAsset`.`id`
SET `MediaAsset`.`scope` = 'CATEGORY';

-- CreateIndex
CREATE INDEX `MediaAsset_scope_createdAt_idx` ON `MediaAsset`(`scope`, `createdAt`);
