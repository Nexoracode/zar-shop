-- AlterTable
ALTER TABLE `StoreSetting` ADD COLUMN `cardToCardBankName` VARCHAR(80) NULL,
    ADD COLUMN `cardToCardCardNumber` VARCHAR(16) NULL,
    ADD COLUMN `cardToCardEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `cardToCardHolderName` VARCHAR(120) NULL,
    ADD COLUMN `cardToCardSheba` VARCHAR(24) NULL;

-- CreateTable
CREATE TABLE `CardTransferProof` (
    `id` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `receiptUrl` TEXT NULL,
    `receiptStorageKey` VARCHAR(191) NULL,
    `receiptMimeType` VARCHAR(100) NULL,
    `receiptSizeBytes` INTEGER NULL,
    `receiptOriginalName` VARCHAR(191) NULL,
    `sourceCardNumber` VARCHAR(16) NULL,
    `trackingCode` VARCHAR(30) NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,
    `reviewedById` VARCHAR(191) NULL,
    `rejectionReason` VARCHAR(500) NULL,

    UNIQUE INDEX `CardTransferProof_paymentId_key`(`paymentId`),
    UNIQUE INDEX `CardTransferProof_receiptStorageKey_key`(`receiptStorageKey`),
    INDEX `CardTransferProof_trackingCode_idx`(`trackingCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CardTransferProof` ADD CONSTRAINT `CardTransferProof_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

