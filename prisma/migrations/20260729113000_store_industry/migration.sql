ALTER TABLE `Product`
    ADD COLUMN `storeIndustry` ENUM('GOLD', 'GENERAL') NOT NULL DEFAULT 'GOLD';

CREATE TABLE `StoreSetting` (
    `id` VARCHAR(20) NOT NULL DEFAULT 'main',
    `industry` ENUM('GOLD', 'GENERAL') NOT NULL DEFAULT 'GOLD',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `StoreSetting` (`id`, `industry`, `updatedAt`)
VALUES ('main', 'GOLD', CURRENT_TIMESTAMP(3));
