const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PDFDocument = require("pdfkit");

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


// Consultar todos los Clientes
const consultar = async (req, res) => {
    try {
        const rentas = await prisma.Renta.findMany({
            include: {
                cliente: true,
                vehiculo: true,
            },
        });

        // formateo de fechas antes de enviarlas
        const rentasFormateados = rentas.map((r) => ({
            ...r,
            fechaEntrega: r.fechaEntrega.toISOString().split("T")[0],
            fechaDevolucion: r.fechaDevolucion.toISOString().split("T")[0],
        }));
        res.status(200).json(rentasFormateados);
    } catch (error) {
        console.error('Error al consultar la tabla Clientes:', error);
        res.status(500).json({ error: 'Error al consultar la tabla rentas' });
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

        // Calcular días y total - Convertir los strings "YYYY-MM-DD" en Date (a medianoche local)
        const fechaInicio = new Date(`${fechaEntrega}T00:00:00`);
        const fechaFin = new Date(`${fechaDevolucion}T00:00:00`);

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

        // Formatear fechas antes de responder (solo YYYY-MM-DD)
        const rentaFormateada = {
            ...nuevaRenta,
            fechaEntrega: nuevaRenta.fechaEntrega.toISOString().split("T")[0],
            fechaDevolucion: nuevaRenta.fechaDevolucion.toISOString().split("T")[0],
        };

        res.status(201).json({ message: "Renta creada correctamente", renta: rentaFormateada });
    } catch (error) {
        console.error("Error creando la renta:", error);
        res.status(500).json({ error: "Error creando la renta" });
    }
};



// Nuevo endpoint solo para generar PDF
const generarComprobante = async (req, res) => {
    try {
        const { id } = req.params;

        const renta = await prisma.renta.findUnique({
            where: { id: parseInt(id) },
            include: { cliente: true, vehiculo: true }
        });

        if (!renta) {
            return res.status(404).json({ error: "Renta no encontrada" });
        }

        const doc = new PDFDocument();
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=renta-${renta.id}.pdf`);
        doc.pipe(res);

        doc.fontSize(18).text("Comprobante de Renta", { align: "center" });
        doc.moveDown();

        doc.fontSize(14).text("📌 Datos del Cliente:");
        doc.text(`Nombre: ${renta.cliente.nombre}`);
        doc.text(`Identificación: ${renta.cliente.identificacion}`);
        doc.text(`Dirección: ${renta.cliente.direccion}`);
        doc.text(`Celular: ${renta.cliente.celular}`);
        doc.moveDown();

        doc.fontSize(14).text("🚗 Datos del Vehículo:");
        doc.text(`Nombre: ${renta.vehiculo.nombreVehiculo}`);
        doc.text(`Placa: ${renta.vehiculo.placa}`);
        doc.moveDown();

        doc.fontSize(14).text("📝 Datos de la Renta:");
        doc.text(`Entrega: ${renta.fechaEntrega.toISOString().split("T")[0]} ${renta.horaEntrega}`);
        doc.text(`Devolución: ${renta.fechaDevolucion.toISOString().split("T")[0]} ${renta.horaDevolucion}`);
        doc.text(`Días: ${renta.numeroDias}`);
        doc.text(`Valor por día: $${renta.valorDia}`);
        doc.text(`Total: $${renta.valorTotal}`);

        doc.end();
    } catch (error) {
        console.error("Error generando comprobante:", error);
        res.status(500).json({ error: "Error generando comprobante" });
    }
};





module.exports = { consultar, registerRenta, generarComprobante };