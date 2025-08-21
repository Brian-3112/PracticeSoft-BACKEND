const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


// Consultar todos los Clientes
const consultar = async (req, res) => {
  try {
    const rentas = await prisma.Renta.findMany();
    res.status(200).json(rentas);
  } catch (error) {
    console.error('Error al consultar la tabla Clientes:', error);
    res.status(500).json({ error: 'Error al consultar la tabla Clientes' });
  }
};


// Crear una nueva Renta
const registerRenta = async (req, res) => {
  try {
    const { 
      vehiculoId, 
      clienteId, 
      fechaEntrega, 
      horaEntrega, 
      fechaDevolucion, 
      horaDevolucion, 
      valorDia 
    } = req.body;

    // Calcular días y total
    const fechaInicio = new Date(fechaEntrega);
    const fechaFin = new Date(fechaDevolucion);

    if (fechaFin < fechaInicio) {
      return res.status(400).json({ error: "La fecha de devolución no puede ser anterior a la de entrega" });
    }

    const numeroDias = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24));
    const valorTotal = numeroDias * valorDia;

    // Crear la renta en la DB
    const nuevaRenta = await prisma.renta.create({
      data: {
        vehiculoId: parseInt(vehiculoId),
        clienteId: parseInt(clienteId),
        fechaEntrega: fechaInicio,
        horaEntrega,
        fechaDevolucion: fechaFin,
        horaDevolucion,
        numeroDias,
        valorDia,
        valorTotal,
      },
      include: {
        cliente: true,
        vehiculo: true
      }
    });

    res.status(201).json({ message: "Renta creada correctamente", renta: nuevaRenta });
  } catch (error) {
    console.error("Error creando la renta:", error);
    res.status(500).json({ error: "Error creando la renta" });
  }
};






module.exports = { consultar, registerRenta  };