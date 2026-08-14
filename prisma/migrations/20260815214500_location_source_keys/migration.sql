DROP INDEX `Province_externalId_key` ON `Province`;
DROP INDEX `City_externalId_key` ON `City`;
CREATE UNIQUE INDEX `Province_source_externalId_key` ON `Province` (`source`, `externalId`);
CREATE UNIQUE INDEX `City_source_externalId_key` ON `City` (`source`, `externalId`);
