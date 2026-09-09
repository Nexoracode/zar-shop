-- AlterTable
ALTER TABLE `storesetting` ADD COLUMN `setupCompletedAt` DATETIME(3) NULL,
    ADD COLUMN `setupStepsDone` JSON NULL;

-- Existing stores are already configured and live; mark their setup complete so the
-- onboarding wizard only ever appears on a fresh install where the row is created anew.
UPDATE `storesetting` SET `setupCompletedAt` = CURRENT_TIMESTAMP(3) WHERE `id` = 'main';
