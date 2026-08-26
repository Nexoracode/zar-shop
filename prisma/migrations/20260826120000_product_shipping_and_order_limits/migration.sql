-- Packaged shipping figures, separate from the gold weight that drives the price.
ALTER TABLE `Product`
  ADD COLUMN `shippingWeightGrams` INTEGER NULL,
  ADD COLUMN `packageLengthCm` DECIMAL(8, 2) NULL,
  ADD COLUMN `packageWidthCm` DECIMAL(8, 2) NULL,
  ADD COLUMN `packageHeightCm` DECIMAL(8, 2) NULL,
  ADD COLUMN `minOrderQuantity` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `maxOrderQuantity` INTEGER NULL;
