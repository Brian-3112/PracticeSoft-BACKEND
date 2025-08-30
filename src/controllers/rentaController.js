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

            // Título
            doc.fontSize(16).text("CONTRATO DE ALQUILER DE VEHICULOS", { align: "center" });
            doc.moveDown();

            // Datos arrendador
            doc.fontSize(12).text("ARRENDADOR: ANTIOCAR Alquiler de vehículos, NIT 8100328 – 9");
            doc.text("Domiciliado en Medellín, Calle 33 # 42b – 41 Galerías de San Diego local 127");
            doc.moveDown();

            // Datos arrendatario
            doc.text(`ARRENDATARIO: ${renta.cliente.nombre} identificado con cédula ${renta.cliente.identificacion}`);
            doc.text(`DIRECCIÓN: ${renta.cliente.direccion}`);
            doc.text(`CELULAR: ${renta.cliente.celular}`);
            doc.text(`CORREO: ${renta.cliente.correo}`);
            doc.moveDown();

            // Referencias
            doc.text("REFERENCIA FAMILIAR:");
            doc.text(`Nombre: ${renta.nombreFamiliar}`);
            doc.text(`Dirección: ${renta.direccionFamiliar}`);
            doc.text(`Teléfono: ${renta.telefonoFamiliar}`);
            doc.moveDown();

            doc.text("REFERENCIA PERSONAL:");
            doc.text(`Nombre: ${renta.nombrePersonal}`);
            doc.text(`Dirección: ${renta.direccionPersonal}`);
            doc.text(`Teléfono: ${renta.telefonoPersonal}`);
            doc.moveDown();


            // Fechas
            doc.text("SEGUNDA: DURACIÓN DEL ALQUILER");
            doc.text(`FECHA ENTREGA: ${renta.fechaEntrega}  HORA: ${renta.horaEntrega}`);
            doc.text(`FECHA DEVOLUCIÓN: ${renta.fechaDevolucion}  HORA: ${renta.horaDevolucion}`);
            doc.moveDown();

            // Pago
            doc.text("TERCERA: PAGO Y CONDICIONES ECONÓMICAS");
            doc.text(`VALOR DÍA: $${renta.valorDia}  |  N° DÍAS: ${renta.numeroDias}  |  FORMA DE PAGO: `);
            doc.text(`El arrendatario se compromete a pagar al arrendador la cantidad de $ por concepto de alquiler.`);
            doc.moveDown();

            // Aquí agregas el resto de las cláusulas fijas que copiaste (solo texto plano)
            doc.text("CUARTA: RESPONSABILIDAD POR DAÑOS Y REPARACIONES");
            doc.text("El Arrendatario será responsable por cualquier daño o pérdida...");
            // ... (sigues pegando las cláusulas del contrato)

            doc.addPage();
            doc.text("INVENTARIO:");
            doc.text("LLANTAS: X  BLOQUEO: X  REPUESTO: X  MATRÍCULA: X");
            // etc...

            // Firmas
            doc.moveDown(3);
            doc.text("ARRENDATARIO: ____________________");
            doc.text("        ARRENDADOR: Antiocar Alquiler de Vehículos", { align: "right" });

            doc.end();
        } catch (error) {
            console.error("Error generando comprobante:", error);
            res.status(500).json({ error: "Error generando comprobante" });
        }
    };





    module.exports = { consultar, registerRenta, generarComprobante };