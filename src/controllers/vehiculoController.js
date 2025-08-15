const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


// Consultar todos los vehículos
const consultar = async (req, res) => {
  try {
    const vehiculos = await prisma.Vehiculo.findMany();

    const vehiculosFormateados = vehiculos.map((v) => ({
      ...v,
      fechaSOAT: v.fechaSOAT.toISOString().split("T")[0],
      fechaTecno: v.fechaTecno.toISOString().split("T")[0],
    }));

    res.status(200).json(vehiculosFormateados);
  } catch (error) {
    console.error('Error al consultar la tabla Vehiculo:', error);
    res.status(500).json({ error: 'Error al consultar la tabla Vehiculo' });
  }
};

// Crear un nuevo vehículo
const registerVehiculo = async (req, res) => {
  try {
    const { nombreVehiculo, placa, transito, fechaSOAT, fechaTecno, description } = req.body;
 

    // Verificar si ya existe un vehículo con esa placa
    const RepeatPlaca = await prisma.Vehiculo.findUnique({
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
    const NuevoVehiculo = await prisma.Vehiculo.create({
      data: {
        nombreVehiculo,
        placa,
        transito,
        fechaSOAT:  new Date(fechaSOAT),
        fechaTecno: new Date(fechaTecno),
        description,
      },
    });

    // Formatear fechas para la respuesta
    const VehiculoFormateado = {
      ...NuevoVehiculo,
      fechaSOAT: NuevoVehiculo.fechaSOAT.toISOString().split("T")[0],
      fechaTecno: NuevoVehiculo.fechaTecno.toISOString().split("T")[0],
    };

    res.status(201).json({ message: "Vehículo creado exitosamente", VehiculoFormateado });
  } catch (error) {
    console.error("Error creando el vehículo:", error);
    res.status(500).json({ error: "Error creando el vehículo" });
  }
};



// ! Actualizar un vehiculo

const actualizar = async (req, res) => {
  try {

    const { nombreVehiculo, placa, transito, fechaSOAT, fechaTecno, description } = req.body;

    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const vehiculos = await prisma.Vehiculo.findUnique({
      where: { id: id },
    });



    if (placa !== vehiculos.placa) {
      // Verificar si ya existe un vehículo con esa placa
      const RepeatPlaca = await prisma.Vehiculo.findUnique({
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
    }



    // Actualizar los valores del registro
    const vehiculoActualizado = await prisma.Vehiculo.update({
      where: { id: id },
      data: {
        nombreVehiculo,
        placa,
        transito,
        fechaSOAT: new Date(fechaSOAT),
        fechaTecno: new Date(fechaTecno),
        description
      }
    });



    res.json({ message: 'Actualización exitosa', vehiculoActualizado });
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
    const vehiculo = await prisma.Vehiculo.findUnique({
      where: { id },
    });

    if (!vehiculo) {
      return res.status(404).json({ message: 'Vehículo no encontrado' });
    }

    // Eliminar el vehículo
    await prisma.Vehiculo.delete({
      where: { id },
    });

    res.json({ message: 'Vehículo eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar el vehículo:', error);
    res.status(500).json({ message: 'Error al eliminar el vehículo' });
  }
};








module.exports = { consultar, registerVehiculo, actualizar, eliminar };
