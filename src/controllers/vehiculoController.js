const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');



const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Consultar todos los vehículos
const consultar = async (req, res) => {
  try {
    const vehiculos = await prisma.vehiculo.findMany();
    res.status(200).json(vehiculos);
  } catch (error) {
    console.error('Error al consultar la tabla Vehiculo:', error);
    res.status(500).json({ error: 'Error al consultar la tabla Vehiculo' });
  }
};

// Crear un nuevo vehículo
const registerVehiculo = async (req, res) => {
  try {
    const { nombreVehiculo, placa, transito, description } = req.body;

    // Verificar si ya existe un vehículo con esa placa
    const RepeatPlaca = await prisma.vehiculo.findUnique({
      where: {
        placa: placa,
      },
    });

    if (RepeatPlaca) {
      return res.status(403).json({
        message: 'Ya existe este vehículo',
        RepeatPlaca,
      });
    }

    // Crear el nuevo vehículo
    const NuevoVehiculo = await prisma.vehiculo.create({
      data: {
        nombreVehiculo,
        placa,
        transito,
        description,
      },
    });

    res.status(201).json({ message: "Vehículo creado", NuevoVehiculo });
  } catch (error) {
    console.error("Error creando el vehículo:", error);
    res.status(500).json({ error: "Error creando el vehículo" });
  }
};

module.exports = { consultar, registerVehiculo };
