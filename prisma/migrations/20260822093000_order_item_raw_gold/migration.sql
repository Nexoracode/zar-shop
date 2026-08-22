-- AGENTS.md requires every order line's price breakdown (raw gold value, making fee,
-- profit, tax, final amount) to be snapshotted at order-creation time. `rawGold` was
-- computed at checkout but never persisted, so it had to be re-derived later instead of
-- read back from the order's own snapshot.
ALTER TABLE `OrderItem` ADD COLUMN `rawGold` DECIMAL(18, 0) NOT NULL DEFAULT 0;
