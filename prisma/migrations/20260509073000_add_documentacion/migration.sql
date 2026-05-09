-- CreateTable
CREATE TABLE `Documentacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombreCliente` VARCHAR(191) NOT NULL,
    `cedula` VARCHAR(191) NOT NULL,
    `fechaContrato` DATE NOT NULL,
    `archivoNombre` VARCHAR(191) NOT NULL,
    `archivoMimeType` VARCHAR(191) NOT NULL,
    `archivoPath` VARCHAR(191) NOT NULL,
    `archivoSize` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
