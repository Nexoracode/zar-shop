-- AlterTable: adds a store-wide "قالب پنل مدیریت" toggle (Classic vs. the new Industry
-- blueprint skin) alongside the existing brand-color fields on StoreSetting.
ALTER TABLE `StoreSetting` ADD COLUMN `adminTemplate` ENUM('CLASSIC', 'INDUSTRY') NOT NULL DEFAULT 'CLASSIC';
