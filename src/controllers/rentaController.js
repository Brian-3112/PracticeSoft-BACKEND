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
    // Nuevo endpoint solo para generar PDF
const generarComprobante = async (req, res) => {
    try {
      const { id } = req.params;
  
      const renta = await prisma.renta.findUnique({
        where: { id: parseInt(id) },
        include: { cliente: true, vehiculo: true },
      });
  
      if (!renta) {
        return res.status(404).json({ error: "Renta no encontrada" });
      }
  
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=contrato-renta-${renta.id}.pdf`
      );
      doc.pipe(res);
  
      const cliente = renta.cliente;
      const vehiculo = renta.vehiculo;
  
      // Helpers para formatear
      const formatFecha = (fecha) =>
        new Date(fecha).toLocaleDateString("es-CO");
  
      const formatMoney = (valor) =>
        valor.toLocaleString("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
        });
  
      // =========================================
      // ENCABEZADO: LOGO + TÍTULO
      // =========================================
      // Si tienes el logo como png:
      // const logoPath = path.join(__dirname, "..", "assets", "logo-antiocar.png");
      // doc.image(logoPath, 350, 20, { width: 180 });
  
      doc.fontSize(16).text("CONTRATO DE ALQUILER DE VEHICULOS", {
        align: "center",
        underline: true,
      });
      doc.moveDown(1.5);
  
      // =========================================
      // DATOS DEL ARRENDADOR (FIJOS)
      // =========================================
      doc.fontSize(10);
      doc.text(
        "ARRENDADOR: ANTIOCAR Alquiler de vehículos, NIT 8100323-8, domiciliado en Medellín.",
        { align: "left" }
      );
      doc.text("Calle 33 # 42B – 41, Galerías de San Diego local 127.");
      doc.moveDown();
  
      // =========================================
      // DATOS DEL ARRENDATARIO (CLIENTE)
      // =========================================
      doc.text(
        `ARRENDATARIO: ${cliente.nombre} identificado con cédula ${cliente.identificacion}`
      );
      doc.text(
        `DIRECCIÓN: ${cliente.direccion}    CELULAR: ${cliente.celular}    CORREO: ${cliente.correo}`
      );
      doc.moveDown(0.8);
  
      // REFERENCIAS
      doc.text("REFERENCIA FAMILIAR:", { underline: true });
      doc.text(`Nombre: ${cliente.nombreFamiliar}`);
      doc.text(`Dirección: ${cliente.direccionFamiliar}`);
      doc.text(`Teléfono: ${cliente.telefonoFamiliar}`);
      doc.moveDown(0.8);
  
      doc.text("REFERENCIA PERSONAL:", { underline: true });
      doc.text(`Nombre: ${cliente.nombrePersonal}`);
      doc.text(`Dirección: ${cliente.direccionPersonal}`);
      doc.text(`Teléfono: ${cliente.telefonoPersonal}`);
      doc.moveDown(1.2);
  
      // =========================================
      // DATOS DEL VEHÍCULO
      // =========================================
      doc.text("PRIMERA: OBJETO DEL CONTRATO", { underline: true });
      doc.text(
        `El arrendador se compromete a alquilar el vehículo ${vehiculo.nombreVehiculo}, `
        + `placa ${vehiculo.placa}, tránsito de ${vehiculo.transito}.`
      );
      doc.moveDown(1.2);
  
      // =========================================
      // FECHAS DE ENTREGA/DEVOLUCIÓN
      // =========================================
      doc.text("SEGUNDA: DURACIÓN DEL ALQUILER", { underline: true });
      doc.text(
        `FECHA ENTREGA: ${formatFecha(renta.fechaEntrega)}  HORA: ${renta.horaEntrega}`
      );
      doc.text(
        `FECHA DEVOLUCIÓN: ${formatFecha(renta.fechaDevolucion)}  HORA: ${renta.horaDevolucion}`
      );
      doc.text(`NÚMERO DE DÍAS: ${renta.numeroDias}`);
      doc.moveDown(1.2);
  
      // =========================================
      // VALORES Y FORMA DE PAGO
      // =========================================
      doc.text("TERCERA: PAGO Y CONDICIONES ECONÓMICAS", { underline: true });
      doc.text(
        `VALOR DÍA: ${formatMoney(renta.valorDia)}    N° DÍAS: ${renta.numeroDias}    `
        + `VALOR TOTAL: ${formatMoney(renta.valorTotal)}`
      );
      doc.moveDown(1.2);
  
      // =========================================
      // AQUÍ PEGAS TODAS LAS CLÁUSULAS DE TEXTO
      // (CUARTA, QUINTA, SEXTA, ... DÉCIMA)
      // =========================================
      doc.text("CUARTA: RESPONSABILIDAD POR DAÑOS Y REPARACIONES", {
        underline: true,
      });
      doc.text(
        "El arrendatario será responsable por cualquier daño o pérdida que sufra el vehículo durante el periodo de alquiler..."
      );
      // ...
      // Repite doc.text(...) con el resto del contrato que tienes en el diseño.
      // Si te pasas de página, puedes usar doc.addPage() manualmente.
  
      // =========================================
      // SEGUNDA / TERCERA PÁGINA – INVENTARIO, DIBUJOS, NOTAS
      // =========================================
      doc.addPage();
  
      doc.fontSize(12).text("INVENTARIO", { align: "center", underline: true });
      doc.moveDown(1);
  
      doc.fontSize(10);
      doc.text("LLANTAS  [  ]  LUCES  [  ]  ESPEJOS  [  ]  RADIO  [  ]  OTROS: __________");
      doc.moveDown(0.5);
      // aquí puedes dibujar líneas, cajas, o incluso imágenes de los carros:
      // doc.image(pathCarroLateral, 60, 200, { width: 80 });
  
      doc.moveDown(3);
      doc.text("NOTA:", { underline: true });
      doc.moveDown(2);
  
      // Firmas
      doc.text("ARRENDATARIO:", 60, 700);
      doc.text("______________________________", 60, 715);
  
      doc.text("ARRENDADOR:", 320, 700);
      doc.text("Antiocar Alquiler de Vehículos", 320, 715);
      // si tienes la firma como imagen:
      // doc.image(pathFirma, 320, 650, { width: 120 });
  
      doc.end();
    } catch (error) {
      console.error("Error generando comprobante:", error);
      res.status(500).json({ error: "Error generando comprobante" });
    }
  };





    module.exports = { consultar, registerRenta, generarComprobante };