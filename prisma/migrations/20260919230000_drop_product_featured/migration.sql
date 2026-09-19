-- The "featured product" flag was only ever used to sort storefront search suggestions.
-- DropIndex
DROP INDEX `Product_featured_status_idx` ON `Product`;

-- AlterTable
ALTER TABLE `Product` DROP COLUMN `featured`;
