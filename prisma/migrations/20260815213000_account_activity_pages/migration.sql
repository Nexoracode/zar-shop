CREATE TABLE `ProductFavorite` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ProductFavorite_userId_productId_key` (`userId`, `productId`),
  INDEX `ProductFavorite_userId_createdAt_idx` (`userId`, `createdAt`),
  INDEX `ProductFavorite_productId_idx` (`productId`),
  CONSTRAINT `ProductFavorite_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProductFavorite_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProductVisit` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `visitCount` INTEGER NOT NULL DEFAULT 1,
  `visitedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ProductVisit_userId_productId_key` (`userId`, `productId`),
  INDEX `ProductVisit_userId_visitedAt_idx` (`userId`, `visitedAt`),
  INDEX `ProductVisit_productId_idx` (`productId`),
  CONSTRAINT `ProductVisit_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ProductVisit_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
