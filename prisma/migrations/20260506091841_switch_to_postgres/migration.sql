-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NULL,
    `apellido` VARCHAR(191) NULL,
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
    `fechaSOAT` DATE NOT NULL,
    `fechaTecno` DATE NOT NULL,
    `description` VARCHAR(191) NOT NULL,

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

-- CreateTable
CREATE TABLE `Renta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vehiculoId` INTEGER NOT NULL,
    `clienteId` INTEGER NOT NULL,
    `fechaEntrega` DATE NOT NULL,
    `horaEntrega` VARCHAR(191) NOT NULL,
    `fechaDevolucion` DATE NOT NULL,
    `horaDevolucion` VARCHAR(191) NOT NULL,
    `numeroDias` INTEGER NOT NULL,
    `valorDia` DOUBLE NOT NULL,
    `valorTotal` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Renta` ADD CONSTRAINT `Renta_vehiculoId_fkey` FOREIGN KEY (`vehiculoId`) REFERENCES `Vehiculo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Renta` ADD CONSTRAINT `Renta_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
