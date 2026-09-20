-- A product with combinations is now discounted by its combinations alone: each one either has a
-- discount of its own or has none. The product's own discount used to leak into every combination
-- that had no discount of its own, so clear whatever is still stored on products that have any.
UPDATE `Product`
SET `discountType` = NULL,
    `discountValue` = NULL,
    `discountStartsAt` = NULL,
    `discountEndsAt` = NULL
WHERE `discountType` IS NOT NULL
  AND EXISTS (SELECT 1 FROM `ProductVariant` WHERE `ProductVariant`.`productId` = `Product`.`id`);
