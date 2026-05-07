-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT,
    "apellido" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehiculo" (
    "id" SERIAL NOT NULL,
    "nombreVehiculo" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "transito" TEXT NOT NULL,
    "fechaSOAT" DATE NOT NULL,
    "fechaTecno" DATE NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Vehiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "identificacion" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "celular" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "nombreFamiliar" TEXT NOT NULL,
    "direccionFamiliar" TEXT NOT NULL,
    "telefonoFamiliar" TEXT NOT NULL,
    "nombrePersonal" TEXT NOT NULL,
    "direccionPersonal" TEXT NOT NULL,
    "telefonoPersonal" TEXT NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Renta" (
    "id" SERIAL NOT NULL,
    "vehiculoId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "fechaEntrega" DATE NOT NULL,
    "horaEntrega" TEXT NOT NULL,
    "fechaDevolucion" DATE NOT NULL,
    "horaDevolucion" TEXT NOT NULL,
    "numeroDias" INTEGER NOT NULL,
    "valorDia" DOUBLE PRECISION NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Renta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vehiculo_placa_key" ON "Vehiculo"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_identificacion_key" ON "Cliente"("identificacion");

-- AddForeignKey
ALTER TABLE "Renta" ADD CONSTRAINT "Renta_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "Vehiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Renta" ADD CONSTRAINT "Renta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
