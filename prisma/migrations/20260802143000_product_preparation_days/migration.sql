ALTER TABLE `Product`
    ADD COLUMN `preparationDays` INTEGER NOT NULL DEFAULT 2;

UPDATE `Product`
SET `preparationDays` = COALESCE(
    (SELECT `preparationDays` FROM `StoreSetting` WHERE `id` = 'main' LIMIT 1),
    2
);
