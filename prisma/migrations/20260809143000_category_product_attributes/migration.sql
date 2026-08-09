ALTER TABLE `Category`
  ADD COLUMN `attributeSchema` JSON NULL;

ALTER TABLE `Product`
  ADD COLUMN `attributes` JSON NULL;
