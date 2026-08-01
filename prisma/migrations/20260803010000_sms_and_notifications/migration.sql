ALTER TABLE `User`
  ADD COLUMN `smsMarketingConsent` BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE `SmsProviderConfig` (
  `id` VARCHAR(191) NOT NULL,
  `provider` VARCHAR(40) NOT NULL,
  `displayName` VARCHAR(100) NOT NULL,
  `credentialsEncrypted` TEXT NOT NULL,
  `credentialMasked` VARCHAR(80) NOT NULL,
  `senderNumber` VARCHAR(40) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `SmsProviderConfig_provider_key`(`provider`),
  INDEX `SmsProviderConfig_isActive_updatedAt_idx`(`isActive`, `updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommunicationSetting` (
  `id` VARCHAR(191) NOT NULL DEFAULT 'main',
  `smsEnabled` BOOLEAN NOT NULL DEFAULT false,
  `inAppEnabled` BOOLEAN NOT NULL DEFAULT true,
  `adminPhone` VARCHAR(20) NULL,
  `orderCreatedSms` BOOLEAN NOT NULL DEFAULT false,
  `paymentSuccessSms` BOOLEAN NOT NULL DEFAULT true,
  `orderShippedSms` BOOLEAN NOT NULL DEFAULT true,
  `orderExpiredSms` BOOLEAN NOT NULL DEFAULT false,
  `lowStockAdminSms` BOOLEAN NOT NULL DEFAULT false,
  `templates` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SmsCampaign` (
  `id` VARCHAR(191) NOT NULL,
  `actorId` VARCHAR(191) NULL,
  `provider` VARCHAR(40) NOT NULL,
  `audience` VARCHAR(50) NOT NULL,
  `message` TEXT NOT NULL,
  `recipientCount` INTEGER NOT NULL DEFAULT 0,
  `successfulCount` INTEGER NOT NULL DEFAULT 0,
  `failedCount` INTEGER NOT NULL DEFAULT 0,
  `status` VARCHAR(30) NOT NULL,
  `providerData` JSON NULL,
  `errorMessage` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `SmsCampaign_createdAt_idx`(`createdAt`),
  INDEX `SmsCampaign_actorId_createdAt_idx`(`actorId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
