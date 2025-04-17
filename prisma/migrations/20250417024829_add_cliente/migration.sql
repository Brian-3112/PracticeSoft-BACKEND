-- CreateTable
CREATE TABLE `Cliente` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `identificacion` VARCHAR(191) NOT NULL,
    `direccion` VARCHAR(191) NOT NULL,
    `celular` VARCHAR(191) NOT NULL,
    `correo` VARCHAR(191) NOT NULL,
    `nombreFamiliar` VARCHAR(191) NOT NULL,
    `direccionFamiliar` VARCHAR(191) NOT NULL,
    `telefonoFamiliar` VARCHAR(191) NOT NULL,
    `nombrePersonal` VARCHAR(191) NOT NULL,
    `direccionPersonal` VARCHAR(191) NOT NULL,
    `telefonoPersonal` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Cliente_identificacion_key`(`identificacion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
