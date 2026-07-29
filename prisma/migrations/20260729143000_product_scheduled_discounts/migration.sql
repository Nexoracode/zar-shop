ALTER TABLE `Product`
    ADD COLUMN `discountType` ENUM('PERCENT', 'FIXED') NULL,
    ADD COLUMN `discountValue` DECIMAL(18, 3) NULL,
    ADD COLUMN `discountStartsAt` DATETIME(3) NULL,
    ADD COLUMN `discountEndsAt` DATETIME(3) NULL;

CREATE INDEX `Product_discountEndsAt_idx` ON `Product`(`discountEndsAt`);

ALTER TABLE `OrderItem`
    ADD COLUMN `originalUnitPrice` DECIMAL(18, 0) NOT NULL DEFAULT 0,
    ADD COLUMN `discountAmount` DECIMAL(18, 0) NOT NULL DEFAULT 0;

UPDATE `OrderItem` SET `originalUnitPrice` = `unitPrice`;
