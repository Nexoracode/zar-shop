-- Rename the product guide relation to reflect all option types.
ALTER TABLE `Product` DROP FOREIGN KEY `Product_sizeGuideId_fkey`;
DROP INDEX `Product_sizeGuideId_idx` ON `Product`;
ALTER TABLE `Product` CHANGE COLUMN `sizeGuideId` `optionGuideId` VARCHAR(191) NULL;
CREATE INDEX `Product_optionGuideId_idx` ON `Product`(`optionGuideId`);
ALTER TABLE `Product` ADD CONSTRAINT `Product_optionGuideId_fkey` FOREIGN KEY (`optionGuideId`) REFERENCES `MediaAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Convert the fixed size model to dynamic option groups while preserving existing sizes.
CREATE TABLE `ProductOption` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `values` JSON NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `ProductOption_productId_name_key`(`productId`, `name`),
    INDEX `ProductOption_productId_position_idx`(`productId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `ProductOption` (`id`, `productId`, `name`, `values`, `position`)
SELECT CONCAT('legacy-size-', `productId`), `productId`, 'سایز', JSON_ARRAYAGG(`label`), 0
FROM (SELECT `productId`, `label` FROM `ProductSize` ORDER BY `productId`, `position`) AS `ordered_sizes`
GROUP BY `productId`;

DROP TABLE `ProductSize`;

-- Store a stable snapshot of every selected option in cart items.
CREATE INDEX `CartItem_cartId_idx` ON `CartItem`(`cartId`);
CREATE INDEX `CartItem_productId_idx` ON `CartItem`(`productId`);

ALTER TABLE `CartItem`
    DROP PRIMARY KEY,
    ADD COLUMN `id` VARCHAR(191) NULL,
    ADD COLUMN `selectionKey` VARCHAR(64) NOT NULL DEFAULT '',
    ADD COLUMN `selectedOptions` JSON NULL;

UPDATE `CartItem`
SET `id` = CONCAT('cart-', MD5(CONCAT(`cartId`, '|', `productId`, '|', `selectedSize`))),
    `selectionKey` = CASE WHEN `selectedSize` = '' THEN '' ELSE SHA2(CONCAT('سایز=', `selectedSize`), 256) END,
    `selectedOptions` = CASE WHEN `selectedSize` = '' THEN NULL ELSE JSON_OBJECT('سایز', `selectedSize`) END;

ALTER TABLE `CartItem`
    MODIFY `id` VARCHAR(191) NOT NULL,
    DROP COLUMN `selectedSize`,
    ADD PRIMARY KEY (`id`),
    ADD UNIQUE INDEX `CartItem_cartId_productId_selectionKey_key`(`cartId`, `productId`, `selectionKey`);

-- Preserve the selected size snapshot in historical order items.
ALTER TABLE `OrderItem` ADD COLUMN `selectedOptions` JSON NULL;
UPDATE `OrderItem` SET `selectedOptions` = JSON_OBJECT('سایز', `selectedSize`) WHERE `selectedSize` IS NOT NULL AND `selectedSize` <> '';
ALTER TABLE `OrderItem` DROP COLUMN `selectedSize`;
