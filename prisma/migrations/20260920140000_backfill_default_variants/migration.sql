-- Every product is sold through a variant now: one without options has a single default variant, keyed ''
-- and selecting nothing, that carries its price, discount, stock and order figures. Products created
-- before that rule have no variant at all, so their price and stock read as empty and they cannot be
-- bought. Give each of them a default variant made from the figures the product itself holds.
-- Products that have options but no combinations are left alone: they need their combinations built.
INSERT INTO `ProductVariant` (
  `id`, `productId`, `selectionKey`, `selection`, `price`, `weightGrams`,
  `discountType`, `discountValue`, `discountStartsAt`, `discountEndsAt`,
  `stock`, `preparationDays`, `minOrderQuantity`, `maxOrderQuantity`, `isActive`, `stockVersion`, `createdAt`
)
SELECT
  UUID(), p.`id`, '', JSON_OBJECT(),
  CASE WHEN p.`storeIndustry` = 'GENERAL' THEN p.`fixedPrice` ELSE NULL END,
  CASE WHEN p.`storeIndustry` = 'GOLD' THEN p.`weightGrams` ELSE NULL END,
  p.`discountType`, p.`discountValue`, p.`discountStartsAt`, p.`discountEndsAt`,
  p.`stock`, p.`preparationDays`, p.`minOrderQuantity`, p.`maxOrderQuantity`, TRUE, 0, NOW(3)
FROM `Product` p
WHERE NOT EXISTS (SELECT 1 FROM `ProductVariant` v WHERE v.`productId` = p.`id`)
  AND NOT EXISTS (SELECT 1 FROM `ProductOptionType` o WHERE o.`productId` = p.`id`);
