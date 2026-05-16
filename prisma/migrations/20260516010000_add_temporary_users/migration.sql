-- AlterTable
ALTER TABLE `User`
    ADD COLUMN `role` VARCHAR(191) NOT NULL DEFAULT 'admin',
    ADD COLUMN `isTemporary` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `allowedModules` JSON NULL,
    ADD COLUMN `createdById` INTEGER NULL,
    ADD COLUMN `expiresAt` DATETIME(3) NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- Existing users remain administrators explicitly.
UPDATE `User`
SET `role` = 'admin',
    `isTemporary` = false,
    `isActive` = true
WHERE `role` IS NULL OR `role` = 'admin';
