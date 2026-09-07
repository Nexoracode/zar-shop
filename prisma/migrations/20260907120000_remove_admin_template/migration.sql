-- The admin panel now has a single skin (Blueprint); the CLASSIC template and its toggle are gone.

-- AlterTable
ALTER TABLE `StoreSetting` DROP COLUMN `adminTemplate`;

-- DropEnum-equivalent: MySQL stores the enum inline on the column, so dropping the column above
-- is all that is needed. No separate enum object exists to drop.
