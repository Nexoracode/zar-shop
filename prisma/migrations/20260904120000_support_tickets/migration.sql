-- AlterTable
ALTER TABLE `User` MODIFY COLUMN `role` ENUM('CUSTOMER', 'ADMIN', 'CATALOG_MANAGER', 'USER_MANAGER', 'ORDER_MANAGER', 'SUPPORT_MANAGER') NOT NULL DEFAULT 'CUSTOMER';

-- CreateTable
CREATE TABLE `SupportTicketCategory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SupportTicketCategory_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupportTicket` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `productId` VARCHAR(191) NULL,
    `assignedAgentId` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NOT NULL,
    `status` ENUM('OPEN', 'ANSWERED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `rating` INTEGER NULL,
    `ratingReason` VARCHAR(500) NULL,
    `ratedAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SupportTicket_status_updatedAt_idx`(`status`, `updatedAt`),
    INDEX `SupportTicket_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `SupportTicket_assignedAgentId_idx`(`assignedAgentId`),
    INDEX `SupportTicket_categoryId_idx`(`categoryId`),
    INDEX `SupportTicket_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupportTicketMessage` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SupportTicketMessage_ticketId_createdAt_idx`(`ticketId`, `createdAt`),
    INDEX `SupportTicketMessage_senderId_idx`(`senderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketAttachment` (
    `id` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `url` TEXT NOT NULL,
    `storageKey` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TicketAttachment_storageKey_key`(`storageKey`),
    INDEX `TicketAttachment_messageId_idx`(`messageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SupportTicket` ADD CONSTRAINT `SupportTicket_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportTicket` ADD CONSTRAINT `SupportTicket_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `SupportTicketCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportTicket` ADD CONSTRAINT `SupportTicket_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportTicket` ADD CONSTRAINT `SupportTicket_assignedAgentId_fkey` FOREIGN KEY (`assignedAgentId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportTicketMessage` ADD CONSTRAINT `SupportTicketMessage_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `SupportTicket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportTicketMessage` ADD CONSTRAINT `SupportTicketMessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketAttachment` ADD CONSTRAINT `TicketAttachment_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `SupportTicketMessage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default ticket categories (editable/removable from the admin panel afterward)
INSERT INTO `SupportTicketCategory` (`id`, `name`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`) VALUES
    ('seed-ticket-cat-order', 'سفارش و پرداخت', true, 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('seed-ticket-cat-return', 'مرجوعی و گارانتی', true, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('seed-ticket-cat-account', 'حساب کاربری', true, 2, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    ('seed-ticket-cat-other', 'سایر', true, 3, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
