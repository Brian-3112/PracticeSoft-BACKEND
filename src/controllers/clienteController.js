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



// ! Actualizar un vehiculo

const actualizar = async (req, res) => {
  try {

    const { nombre, identificacion, direccion, celular, correo, nombreFamiliar, direccionFamiliar, telefonoFamiliar, 
        nombrePersonal, direccionPersonal, telefonoPersonal } = req.body;

    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const clientes = await prisma.Cliente.findUnique({
      where: { id: id },
    });



    if (identificacion !== clientes.identificacion) {
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
    }



    // Actualizar los valores del registro
    const clienteActualizado = await prisma.Cliente.update({
      where: { id: id },
      data: {
        nombre, identificacion, direccion, celular, correo, nombreFamiliar, direccionFamiliar, telefonoFamiliar, 
        nombrePersonal, direccionPersonal, telefonoPersonal 
      }
    });



    res.json({ message: 'Actualización exitosa', clienteActualizado });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el vehiculo ' });
  }
}



// Eliminar un vehículo
const eliminar = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    // Verificar si el vehículo existe
    const cliente = await prisma.Cliente.findUnique({
      where: { id },
    });

    if (!cliente) {
      return res.status(404).json({ message: 'Cliente no encontrado' });
    }

    // Eliminar el vehículo
    await prisma.Cliente.delete({
      where: { id },
    });

    res.json({ message: 'Cliente eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar el Cliente:', error);
    res.status(500).json({ message: 'Error al eliminar el Cliente' });
  }
};





module.exports = { consultar, registerCliente, actualizar, eliminar };