-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vehiculo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombreVehiculo` VARCHAR(191) NOT NULL,
    `placa` VARCHAR(191) NOT NULL,
    `transito` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Vehiculo_placa_key`(`placa`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
