-- Every store keeps one default packaging box, so a parcel always has a box to go in.
-- A default that was switched off is switched back on; only a store with no default at all gets a new one.
UPDATE `PackagingBox` SET `isActive` = true WHERE `isDefault` = true;

-- Only one box may hold the flag. Concurrent checkouts on an earlier build could each restore a default,
-- leaving twins; the first stays the default and the rest keep existing as ordinary boxes.
UPDATE `PackagingBox` SET `isDefault` = false
WHERE `isDefault` = true
  AND `id` <> (SELECT `keep_id` FROM (SELECT `id` AS `keep_id` FROM `PackagingBox` WHERE `isDefault` = true ORDER BY `sortOrder`, `createdAt`, `id` LIMIT 1) AS `keeper`);

INSERT INTO `PackagingBox` (`id`, `name`, `lengthCm`, `widthCm`, `heightCm`, `weightGrams`, `maxWeightGrams`, `tapinBoxId`, `isDefault`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`)
SELECT 'default-packaging-box', 'بسته‌بندی استاندارد', 30.00, 20.00, 15.00, 150, 5000, NULL, true, true, 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `PackagingBox` WHERE `isDefault` = true);
