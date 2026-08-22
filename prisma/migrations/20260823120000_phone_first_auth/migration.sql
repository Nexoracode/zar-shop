-- AlterTable: phone becomes the primary login identifier; email is now optional and only
-- ever set later from the account profile.
ALTER TABLE `User` MODIFY COLUMN `email` VARCHAR(191) NULL;

-- CreateTable: generalizes PasswordResetCode into a phone-keyed, purpose-discriminated OTP
-- table so the same table/module can issue and verify codes for REGISTER (before any User
-- row exists), LOGIN (passwordless sign-in), and RESET_PASSWORD.
CREATE TABLE `PhoneOtpCode` (
    `id` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `purpose` ENUM('REGISTER', 'LOGIN', 'RESET_PASSWORD') NOT NULL,
    `codeHash` CHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `consumedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PhoneOtpCode_phone_purpose_idx`(`phone`, `purpose`),
    INDEX `PhoneOtpCode_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- DropTable: fully superseded by PhoneOtpCode. Rows are short-lived (10-minute TTL), so
-- nothing of lasting value is lost.
ALTER TABLE `PasswordResetCode` DROP FOREIGN KEY `PasswordResetCode_userId_fkey`;
DROP TABLE `PasswordResetCode`;
