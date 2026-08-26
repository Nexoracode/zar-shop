-- The shared library: a kind of variation, defined once and reused by every product.
CREATE TABLE `OptionType` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `kind` ENUM('SELECT', 'COLOR') NOT NULL DEFAULT 'SELECT',
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `OptionType_name_key`(`name`),
  INDEX `OptionType_isActive_sortOrder_name_idx`(`isActive`, `sortOrder`, `name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OptionValue` (
  `id` VARCHAR(191) NOT NULL,
  `typeId` VARCHAR(191) NOT NULL,
  `label` VARCHAR(80) NOT NULL,
  `colorId` VARCHAR(191) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `OptionValue_typeId_label_key`(`typeId`, `label`),
  INDEX `OptionValue_typeId_isActive_sortOrder_idx`(`typeId`, `isActive`, `sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Which types a product varies by, and which of their values it offers.
CREATE TABLE `ProductOptionType` (
  `productId` VARCHAR(191) NOT NULL,
  `typeId` VARCHAR(191) NOT NULL,
  `position` INTEGER NOT NULL DEFAULT 0,
  INDEX `ProductOptionType_productId_position_idx`(`productId`, `position`),
  PRIMARY KEY (`productId`, `typeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Which of a type's values this product offers; a row rather than a list of ids, so the catalogue
-- can join through to the colour and filter by it.
CREATE TABLE `ProductOptionValue` (
  `productId` VARCHAR(191) NOT NULL,
  `typeId` VARCHAR(191) NOT NULL,
  `valueId` VARCHAR(191) NOT NULL,
  `position` INTEGER NOT NULL DEFAULT 0,
  INDEX `ProductOptionValue_valueId_idx`(`valueId`),
  PRIMARY KEY (`productId`, `typeId`, `valueId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- One buyable combination, with its own price, discount and stock.
CREATE TABLE `ProductVariant` (
  `id` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `selectionKey` VARCHAR(64) NOT NULL,
  `selection` JSON NOT NULL,
  `price` DECIMAL(18, 0) NULL,
  `weightGrams` DECIMAL(10, 3) NULL,
  `discountType` ENUM('PERCENT', 'FIXED') NULL,
  `discountValue` DECIMAL(18, 3) NULL,
  `stock` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `stockVersion` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `ProductVariant_productId_selectionKey_key`(`productId`, `selectionKey`),
  INDEX `ProductVariant_productId_isActive_idx`(`productId`, `isActive`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `OptionValue` ADD CONSTRAINT `OptionValue_typeId_fkey` FOREIGN KEY (`typeId`) REFERENCES `OptionType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `OptionValue` ADD CONSTRAINT `OptionValue_colorId_fkey` FOREIGN KEY (`colorId`) REFERENCES `Color`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ProductOptionType` ADD CONSTRAINT `ProductOptionType_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ProductOptionType` ADD CONSTRAINT `ProductOptionType_typeId_fkey` FOREIGN KEY (`typeId`) REFERENCES `OptionType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ProductOptionValue` ADD CONSTRAINT `ProductOptionValue_optionType_fkey` FOREIGN KEY (`productId`, `typeId`) REFERENCES `ProductOptionType`(`productId`, `typeId`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ProductOptionValue` ADD CONSTRAINT `ProductOptionValue_valueId_fkey` FOREIGN KEY (`valueId`) REFERENCES `OptionValue`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Open carts referencing the old per-value model would check out against combinations that no
-- longer exist, so they go with it. Placed orders keep their own snapshot and are untouched.
DELETE FROM `CartItem` WHERE `selectionKey` <> '';

-- An order line records the combination it bought, so cancelling it knows which row to credit.
ALTER TABLE `OrderItem` ADD COLUMN `selectionKey` VARCHAR(64) NOT NULL DEFAULT '';

DROP TABLE `ProductOption`;
