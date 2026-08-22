-- Adds an optimistic-concurrency version column so concurrent checkouts can no longer
-- clobber each other's per-option-value stock decrements (lost-update race condition).
ALTER TABLE `ProductOption` ADD COLUMN `stockVersion` INTEGER NOT NULL DEFAULT 0;
