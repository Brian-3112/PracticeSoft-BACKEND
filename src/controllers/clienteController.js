const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


// Consultar todos los Clientes
const consultar = async (req, res) => {
    try {
        const clientes = await prisma.Cliente.findMany();
        res.status(200).json(clientes);
    } catch (error) {
        console.error('Error al consultar la tabla Clientes:', error);
        res.status(500).json({ error: 'Error al consultar la tabla Clientes' });
    }
};



// Crear un nuevo Cliente
const registerCliente = async (req, res) => {
    try {
        const { nombre, identificacion, direccion, celular, correo, nombreFamiliar, direccionFamiliar, telefonoFamiliar, 
            nombrePersonal, direccionPersonal, telefonoPersonal } = req.body;

        // Verificar si ya existe un cliente con la misma cedula.
        const RepeatID = await prisma.Cliente.findUnique({
            where: {
                identificacion: identificacion,
            },
        });

        if (RepeatID) {
            return res.status(403).json({
                message: 'Ya existe este Cliente',
                RepeatID,
            });
        }

        // Crear el nuevo vehículo
        const NuevoCiente = await prisma.Cliente.create({
            data: {
                nombre, identificacion, direccion, celular, correo, nombreFamiliar, direccionFamiliar, telefonoFamiliar, 
            nombrePersonal, direccionPersonal, telefonoPersonal
            },
        });

        res.status(201).json({ message: "Cliente creado", NuevoCiente });
    } catch (error) {
        console.error("Error creando el Cliente:", error);
        res.status(500).json({ error: "Error creando el Cliente" });
    }
};







module.exports = { consultar, registerCliente };