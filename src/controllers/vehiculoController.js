const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require("@prisma/client");


const prisma = new PrismaClient();



const consultar = async (req, res) => {
    try {
        // Consultar todos los registros de la tabla Vehiculo
        const vehiculos = await prisma.vehiculo.findMany();

        res.status(200).json(vehiculos);
    } catch (error) {
        console.log('Error al consultar la tabla Vehiculo:', error);
        res.status(500).json({ error: 'Error al consultar la tabla Vehiculo' });
    }
};

module.exports = { consultar };
