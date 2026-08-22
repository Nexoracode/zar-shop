-- AlterTable: replace the "does the name contain رنگ" heuristic with an explicit column.
ALTER TABLE `ProductOption` ADD COLUMN `type` ENUM('SELECT', 'COLOR') NOT NULL DEFAULT 'SELECT';

-- Backfill: the color-picker UI (and its colorId requirement) previously only ever appeared
-- for option groups whose name contained "رنگ", so that is exactly the set of existing rows
-- that must become COLOR now that the type is explicit instead of inferred.
UPDATE `ProductOption` SET `type` = 'COLOR' WHERE `name` LIKE '%رنگ%';
