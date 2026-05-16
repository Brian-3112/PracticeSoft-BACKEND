-- Ensure temporary-user columns exist even in environments that missed prior migration
ALTER TABLE `User`
    ADD COLUMN IF NOT EXISTS `role` VARCHAR(191) NOT NULL DEFAULT 'admin',
    ADD COLUMN IF NOT EXISTS `isTemporary` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS `allowedModules` JSON NULL,
    ADD COLUMN IF NOT EXISTS `createdById` INTEGER NULL,
    ADD COLUMN IF NOT EXISTS `expiresAt` DATETIME(3) NULL,
    ADD COLUMN IF NOT EXISTS `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- Backfill role according to temporary flag where applicable
UPDATE `User`
SET `role` = CASE WHEN `isTemporary` = true THEN 'temporal' ELSE 'admin' END
WHERE `role` IS NULL OR `role` = '';
