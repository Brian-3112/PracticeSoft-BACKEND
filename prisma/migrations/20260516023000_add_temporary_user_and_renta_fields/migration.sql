-- AlterTable
ALTER TABLE `Renta`
    ADD COLUMN `diasCobrados` INTEGER NULL,
    ADD COLUMN `tipoCalculoRenta` VARCHAR(191) NULL,
    ADD COLUMN `cobroDiaCalendario` BOOLEAN NULL;

-- Backfill to preserve previous behavior (cobro por días transcurridos)
UPDATE `Renta`
SET `diasCobrados` = `numeroDias`
WHERE `diasCobrados` IS NULL;
