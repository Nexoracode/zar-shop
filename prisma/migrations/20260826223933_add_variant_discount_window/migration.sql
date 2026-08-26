-- DropForeignKey
ALTER TABLE `productoptionvalue` DROP FOREIGN KEY `ProductOptionValue_optionType_fkey`;

-- AlterTable
ALTER TABLE `productvariant` ADD COLUMN `discountEndsAt` DATETIME(3) NULL,
    ADD COLUMN `discountStartsAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `ProductVariant_discountEndsAt_idx` ON `ProductVariant`(`discountEndsAt`);

-- AddForeignKey
ALTER TABLE `ProductOptionValue` ADD CONSTRAINT `ProductOptionValue_productId_typeId_fkey` FOREIGN KEY (`productId`, `typeId`) REFERENCES `ProductOptionType`(`productId`, `typeId`) ON DELETE CASCADE ON UPDATE CASCADE;
