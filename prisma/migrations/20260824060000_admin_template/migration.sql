-- AlterTable: which skin the admin panel renders. CLASSIC keeps the existing HeroUI-based
-- chrome; BLUEPRINT selects the HeroUI-free "Industry" template. Defaulting to CLASSIC keeps
-- every existing store on the layout it already has.
ALTER TABLE `StoreSetting` ADD COLUMN `adminTemplate` ENUM('CLASSIC', 'BLUEPRINT') NOT NULL DEFAULT 'CLASSIC';
