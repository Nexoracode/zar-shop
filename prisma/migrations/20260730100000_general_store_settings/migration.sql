ALTER TABLE `User`
  ADD COLUMN `isGuest` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `StoreSetting`
  ADD COLUMN `storeName` VARCHAR(120) NOT NULL DEFAULT 'زر گالری',
  ADD COLUMN `tagline` VARCHAR(191) NOT NULL DEFAULT 'طلا، روایت ماندگار شما',
  ADD COLUMN `shortDescription` VARCHAR(500) NOT NULL DEFAULT 'فروش آنلاین زیورآلات طلای ۱۸ عیار با قیمت روز و فاکتور رسمی',
  ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'IRR',
  ADD COLUMN `timezone` VARCHAR(50) NOT NULL DEFAULT 'Asia/Tehran',
  ADD COLUMN `supportPhone` VARCHAR(30) NULL,
  ADD COLUMN `supportEmail` VARCHAR(191) NULL,
  ADD COLUMN `storeAddress` TEXT NULL,
  ADD COLUMN `legalIdentifier` VARCHAR(80) NULL,
  ADD COLUMN `supportHours` VARCHAR(191) NULL,
  ADD COLUMN `isStoreActive` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `guestCheckout` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `maintenanceMode` BOOLEAN NOT NULL DEFAULT false;

UPDATE `StoreSetting`
SET
  `shortDescription` = 'فروش آنلاین زیورآلات طلای ۱۸ عیار با قیمت روز و فاکتور رسمی',
  `supportPhone` = '۰۲۱-۰۰۰۰۰۰۰۰',
  `supportEmail` = 'support@zargallery.ir',
  `supportHours` = 'شنبه تا پنجشنبه، ۹ تا ۱۸';
