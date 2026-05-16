-- AlterTable
ALTER TABLE `Renta`
    ADD COLUMN `diasCobrados` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `cobroDiaCalendario` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `tipoCalculoRenta` VARCHAR(191) NOT NULL DEFAULT 'periodo_24_horas';

-- Backfill the new charged-days field with the existing calculation result.
UPDATE `Renta`
SET `diasCobrados` = `numeroDias`
WHERE `diasCobrados` = 0;
