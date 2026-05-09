   const bcrypt = require('bcryptjs');
   const jwt = require('jsonwebtoken');
   const PDFDocument = require("pdfkit");
   const fs = require("fs");
   const path = require("path");
  const AdmZip = require("adm-zip");

   const { PrismaClient } = require("@prisma/client");
   const prisma = new PrismaClient();

const parseDateOnly = (value) => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
    }

    const raw = String(value ?? "").trim();
    if (!raw) return null;

    let year;
    let month;
    let day;

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        [year, month, day] = raw.split("-").map(Number);
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
        [day, month, year] = raw.split("/").map(Number);
    } else {
        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) return null;
        return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
    }

    const utcDate = new Date(Date.UTC(year, month - 1, day));
    if (
        utcDate.getUTCFullYear() !== year ||
        utcDate.getUTCMonth() !== month - 1 ||
        utcDate.getUTCDate() !== day
    ) {
        return null;
    }
    return utcDate;
};

const formatDate = (value) => {
    const date = parseDateOnly(value);
    if (!date) return "";
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const formatDateDMY = (value) => {
    const date = parseDateOnly(value);
    if (!date) return "";
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
};
const toTitleCaseName = (value) =>
    String(value ?? "")
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  const formatMoney = (value) =>
      Number(value ?? 0).toLocaleString("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
      });
  const escapeXml = (value) =>
      String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");

  const buildTextRun = (text) => `<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
const buildStyledTextRun = (text, options = {}) => {
    const { size = 18, color = null, bold = false } = options;
    const boldXml = bold ? "<w:b/><w:bCs/>" : "";
    const colorXml = color ? `<w:color w:val="${color}"/>` : "";
    return `<w:r><w:rPr>${boldXml}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>${colorXml}<w:lang w:val="es-ES"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
};

  const fillCellAfterHeader = (xml, header, value) => {
      const safeHeader = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(
          `(<w:t[^>]*>${safeHeader}<\\/w:t>[\\s\\S]*?<\\/w:tc><w:tc[\\s\\S]*?<w:p[^>]*>)([\\s\\S]*?)(<\\/w:p>)`
      );
      return xml.replace(regex, `$1${buildTextRun(value)}$3`);
  };

const fillCellAfterHeaderOccurrence = (xml, header, value, occurrence = 1, runBuilder = buildTextRun) => {
    const safeHeader = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
        `(<w:t[^>]*>${safeHeader}<\\/w:t>[\\s\\S]*?<\\/w:tc><w:tc[\\s\\S]*?<w:p[^>]*>)([\\s\\S]*?)(<\\/w:p>)`,
        "g"
    );
    let count = 0;
    return xml.replace(regex, (match, p1, _p2, p3) => {
        count += 1;
        if (count === occurrence) {
            return `${p1}${runBuilder(value)}${p3}`;
        }
        return match;
    });
};

const fillCellAfterHeaderOccurrenceWithAlignment = (
    xml,
    header,
    value,
    occurrence = 1,
    align = "left",
    runBuilder = buildTextRun
) => {
    const safeHeader = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
        `(<w:t[^>]*>${safeHeader}<\\/w:t>[\\s\\S]*?<\\/w:tc><w:tc[\\s\\S]*?<w:p[^>]*>)([\\s\\S]*?)(<\\/w:p>)`,
        "g"
    );
    let count = 0;
    return xml.replace(regex, (match, p1, _p2, p3) => {
        count += 1;
        if (count === occurrence) {
            return `${p1}<w:pPr><w:jc w:val="${align}"/></w:pPr>${runBuilder(value)}${p3}`;
        }
        return match;
    });
};

const fillCellAfterHeaderWithAlignment = (xml, header, value, align = "left") => {
    const safeHeader = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
        `(<w:t[^>]*>${safeHeader}<\\/w:t>[\\s\\S]*?<\\/w:tc><w:tc[\\s\\S]*?<w:p[^>]*>)([\\s\\S]*?)(<\\/w:p>)`
    );
    return xml.replace(
        regex,
        `$1<w:pPr><w:jc w:val="${align}"/></w:pPr>${buildTextRun(value)}$3`
    );
};

const formatHourAmPm = (value) => {
    if (!value) return "";
    const raw = String(value).trim();

    let hours = null;
    let minutes = null;

    if (/^\d{4}$/.test(raw)) {
        hours = Number(raw.slice(0, 2));
        minutes = Number(raw.slice(2, 4));
    } else if (/^\d{1,2}:\d{2}$/.test(raw)) {
        const [h, m] = raw.split(":");
        hours = Number(h);
        minutes = Number(m);
    } else if (/^\d{1,2}:\d{2}:\d{2}$/.test(raw)) {
        const [h, m] = raw.split(":");
        hours = Number(h);
        minutes = Number(m);
    } else {
        return raw;
    }

    if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return raw;
    }

    const period = hours >= 12 ? "pm" : "am";
    const hour12 = hours % 12 || 12;
    return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
};

const fillMontoTotalEnRojo = (xml, totalText) => {
    const marker = "El arrendatario se compromete a pagar al arrendador la cantidad de ";
    const markerIndex = xml.indexOf(marker);
    if (markerIndex === -1) return xml;

    const amountRun = buildStyledTextRun(`${totalText} `, { size: 18, color: "FF0000", bold: true });
    const beforeMarker = xml.slice(0, markerIndex);
    const fromMarker = xml.slice(markerIndex);
    const updatedFromMarker = fromMarker.replace(
        /<w:r\b[\s\S]*?<w:t xml:space="preserve">\s{6}<\/w:t><\/w:r>/,
        amountRun
    );

    return beforeMarker + updatedFromMarker;
};

const buildParagraph = (text, align = "left", size = 18) =>
    `<w:p><w:pPr><w:jc w:val="${align}"/></w:pPr>${buildStyledTextRun(text, { size })}</w:p>`;

const fillCelularCorreoSection = (xml, cliente = {}) => {
    const contactoRegex =
        /<w:tr\b[\s\S]*?<w:t>CELULAR:<\/w:t>[\s\S]*?<w:t>CORREO:<\/w:t>[\s\S]*?<\/w:tr><w:tr\b[\s\S]*?<\/w:tr>/;

    return xml.replace(contactoRegex, (block) => {
        let updated = block.replace(/<w:t>CORREO:<\/w:t>/, "<w:t>CORREO ELECTRONICO:<\/w:t>");

        const secondRowStart = updated.lastIndexOf("<w:tr");
        if (secondRowStart === -1) return updated;

        const firstPart = updated.slice(0, secondRowStart);
        let secondRow = updated.slice(secondRowStart);

        let paragraphIndex = 0;
        secondRow = secondRow.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraph) => {
            paragraphIndex += 1;
            if (paragraphIndex === 1) {
                return buildParagraph(cliente.celular || "", "center", 18);
            }
            if (paragraphIndex === 2) {
                return buildParagraph(cliente.correo || "", "center", 18);
            }
            return paragraph;
        });

        return firstPart + secondRow;
    });
};

const fillDireccionSection = (xml, cliente = {}) => {
    const direccionRegex =
        /<w:tr\b[\s\S]*?<w:t>DIRECCION<\/w:t>[\s\S]*?<\/w:tr><w:tr\b[\s\S]*?<\/w:tr>/;

    return xml.replace(direccionRegex, (block) => {
        const secondRowStart = block.lastIndexOf("<w:tr");
        if (secondRowStart === -1) return block;

        const firstPart = block.slice(0, secondRowStart);
        let secondRow = block.slice(secondRowStart);

        let paragraphIndex = 0;
        secondRow = secondRow.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraph) => {
            paragraphIndex += 1;
            if (paragraphIndex === 1) {
                return buildParagraph(cliente.direccion || "", "center", 18);
            }
            return paragraph;
        });

        return firstPart + secondRow;
    });
};

const fillReferenceSection = (xml, cliente = {}) => {
    const insertValueAtParagraphEnd = (paragraphXml, value, size = 18) => {
        if (!value) return paragraphXml;
        return paragraphXml.replace(/<\/w:p>$/, `${buildStyledTextRun(` ${value}`, { size })}<\/w:p>`);
    };

    const values = [
        cliente.nombreFamiliar || "",
        cliente.nombrePersonal || "",
        cliente.direccionFamiliar || "",
        cliente.direccionPersonal || "",
        cliente.telefonoFamiliar || "",
        cliente.telefonoPersonal || "",
    ];

    const markerIndex = xml.indexOf("REFERENCIA FAMILIAR:");
    if (markerIndex === -1) return xml;

    const tableStart = xml.indexOf("<w:tbl", markerIndex);
    if (tableStart === -1) return xml;

    const tableEnd = xml.indexOf("</w:tbl>", tableStart);
    if (tableEnd === -1) return xml;

    const tableXml = xml.slice(tableStart, tableEnd + 8);
    let paragraphCount = 0;

    const updatedTable = tableXml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraph) => {
        const hasLabel = /<w:t[^>]*>\s*(Nombre|Direcci[^<]*n|Tel[^<]*fono)\s*<\/w:t>/i.test(paragraph);
        if (!hasLabel) return paragraph;

        const value = values[paragraphCount] || "";
        paragraphCount += 1;
        return insertValueAtParagraphEnd(paragraph, value, 18);
    });

    return xml.slice(0, tableStart) + updatedTable + xml.slice(tableEnd + 8);
};

const compactFinalSignatureSpacing = (xml) => {
    const signatureIndex = xml.lastIndexOf("ARRENDATARIO:");
    if (signatureIndex === -1) return xml;

    const signatureParagraphStart = xml.lastIndexOf("<w:p", signatureIndex);
    if (signatureParagraphStart === -1) return xml;

    let beforeSignature = xml.slice(0, signatureParagraphStart);
    const signatureAndAfter = xml.slice(signatureParagraphStart);
    const emptyParagraphBeforeSignature = /<w:p\b(?:(?!<w:t\b|<w:drawing\b)[\s\S])*?<\/w:p>\s*$/;

    for (let removed = 0; removed < 3 && emptyParagraphBeforeSignature.test(beforeSignature); removed += 1) {
        beforeSignature = beforeSignature.replace(emptyParagraphBeforeSignature, "");
    }

    return beforeSignature + signatureAndAfter;
};
const fillContratoTemplate = (templatePath, renta, options = {}) => {
      const zip = new AdmZip(templatePath);
      const entry = zip.getEntry("word/document.xml");
      if (!entry) {
          throw new Error("No se encontró word/document.xml en la plantilla");
      }

      let xml = zip.readAsText(entry);
      const { contratoVacio = false } = options;
      const cliente = contratoVacio ? {} : (renta.cliente || {});
      const vehiculo = contratoVacio ? {} : (renta.vehiculo || {});
      const fechaEntrega = contratoVacio ? "" : formatDateDMY(renta.fechaEntrega);
      const fechaDevolucion = contratoVacio ? "" : formatDateDMY(renta.fechaDevolucion);
      const horaEntrega = contratoVacio ? "" : formatHourAmPm(renta.horaEntrega);
      const horaDevolucion = contratoVacio ? "" : formatHourAmPm(renta.horaDevolucion);
      const numeroDias = contratoVacio ? "" : String(renta.numeroDias || 0);
      const valorDia = contratoVacio ? "" : formatMoney(renta.valorDia);
      const valorTotal = contratoVacio ? "" : formatMoney(renta.valorTotal);
      const formaPago = contratoVacio ? "" : "Efectivo - Transferencia";

      // Placeholders visibles en la portada del contrato.
      const nombreArrendatario = toTitleCaseName(cliente.nombre || "");
      xml = xml.replace(
          /(<w:t[^>]*>)-{6,}(\s+identificado)/i,
          `$1${escapeXml(nombreArrendatario)}$2`
      );
      xml = xml.replace(
          /<w:t xml:space="preserve">----------------\s*<\/w:t>/,
          `<w:t xml:space="preserve">${escapeXml(nombreArrendatario)} </w:t>`
      );
      xml = xml.replace(
          /<w:t xml:space="preserve">\s*-------------<\/w:t>/,
          `<w:t xml:space="preserve"> ${escapeXml(cliente.identificacion || "")}</w:t>`
      );
      xml = xml.replace(/identificación con cédula/gi, "identificado con cedula");
      xml = xml.replace(/identificacion con cedula/gi, "identificado con cedula");

      // Campos de tablas comunes en esta plantilla.
      xml = fillDireccionSection(xml, cliente);
      xml = fillReferenceSection(xml, cliente);
      xml = fillCellAfterHeaderOccurrenceWithAlignment(
          xml,
          "APARTAMENTO:",
          "UNIDAD RESIDENCIAL O BARRIO:",
          1,
          "center",
          (text) => buildStyledTextRun(text, { size: 18, bold: true })
      );
      xml = fillCelularCorreoSection(xml, cliente);
      xml = fillCellAfterHeaderOccurrence(
          xml,
          "VEHICULO",
          vehiculo.nombreVehiculo || "",
          1,
          (text) => buildStyledTextRun(text, { size: 18 })
      );
      xml = fillCellAfterHeaderOccurrence(
          xml,
          "PLACAS",
          vehiculo.placa || "",
          1,
          (text) => buildStyledTextRun(text, { size: 18 })
      );
      xml = fillCellAfterHeader(xml, "TRÁNSITO", vehiculo.transito || "");
      xml = fillCellAfterHeaderOccurrence(
          xml,
          "FECHA ENTREGA",
          fechaEntrega,
          1,
          (text) => buildStyledTextRun(text, { size: 18 })
      );
      xml = fillCellAfterHeaderOccurrence(
          xml,
          "FECHA DEVOLUCION",
          fechaDevolucion,
          1,
          (text) => buildStyledTextRun(text, { size: 18 })
      );
      xml = fillCellAfterHeaderOccurrence(
          xml,
          "FECHE DEVOLUCION",
          fechaDevolucion,
          1,
          (text) => buildStyledTextRun(text, { size: 18 })
      );
      xml = fillCellAfterHeaderOccurrenceWithAlignment(
          xml,
          "HORA:",
          horaEntrega,
          1,
          "center",
          (text) => buildStyledTextRun(text, { size: 18 })
      );
      xml = fillCellAfterHeaderOccurrenceWithAlignment(
          xml,
          "HORA:",
          horaDevolucion,
          2,
          "center",
          (text) => buildStyledTextRun(text, { size: 18 })
      );
      xml = fillCellAfterHeaderWithAlignment(xml, "No. DIAS", numeroDias, "center");
      xml = fillCellAfterHeaderOccurrenceWithAlignment(
          xml,
          "VALOR DIA",
          valorDia,
          1,
          "center",
          (text) => buildStyledTextRun(text, { size: 18 })
      );
      xml = fillCellAfterHeaderOccurrenceWithAlignment(
          xml,
          "FORMA DE PAGO",
          formaPago,
          1,
          "center",
          (text) => buildStyledTextRun(text, { size: 18 })
      );
      const placaTmpMarker = "__PLACA_TMP__";
      if (contratoVacio) {
          xml = fillCellAfterHeaderOccurrenceWithAlignment(
              xml,
              "OTROS",
              "",
              1,
              "center",
              (text) => buildStyledTextRun(text, { size: 16 })
          );
      } else {
          xml = fillCellAfterHeaderOccurrenceWithAlignment(
              xml,
              "OTROS",
              placaTmpMarker,
              1,
              "center",
              (text) => buildStyledTextRun(text, { size: 16 })
          );
          xml = fillCellAfterHeaderOccurrenceWithAlignment(
              xml,
              placaTmpMarker,
              vehiculo.placa || "",
              1,
              "center",
              (text) => buildStyledTextRun(text, { size: 16 })
          );
          xml = xml.replace(new RegExp(placaTmpMarker, "g"), "X");
      }
      xml = fillMontoTotalEnRojo(xml, valorTotal);
      xml = compactFinalSignatureSpacing(xml);

      zip.updateFile("word/document.xml", Buffer.from(xml, "utf8"));
      return zip.toBuffer();
  };


   // Consultar todas las Rentas
    const consultar = async (req, res) => {
        try {
            const rentas = await prisma.renta.findMany({
                include: {
                    cliente: true,
                    vehiculo: true,
                },
            });

            // formateo de fechas antes de enviarlas
            const rentasFormateados = rentas.map((r) => ({
                ...r,
                fechaEntrega: formatDate(r.fechaEntrega),
                fechaDevolucion: formatDate(r.fechaDevolucion),
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
            const fechaInicio = parseDateOnly(fechaEntrega);
            const fechaFin = parseDateOnly(fechaDevolucion);
            if (!fechaInicio || !fechaFin) {
                return res.status(400).json({ error: "Formato de fecha inválido" });
            }

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
                fechaEntrega: formatDate(nuevaRenta.fechaEntrega),
                fechaDevolucion: formatDate(nuevaRenta.fechaDevolucion),
            };
            const downloadDocx = req.query.formato === "docx";
            if (!downloadDocx) {
                return res.status(201).json({ message: "Renta creada correctamente", renta: rentaFormateada });
            }

            const templatePath = path.join(__dirname, "..", "assets", "contrato-template.docx");
            if (!fs.existsSync(templatePath)) {
                return res.status(500).json({ error: "No se encontró la plantilla del contrato" });
            }

            const docxBuffer = fillContratoTemplate(templatePath, nuevaRenta);
            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            );
            res.setHeader(
                "Content-Disposition",
                `attachment; filename=contrato-renta-${nuevaRenta.id}.docx`
            );
            return res.status(201).send(docxBuffer);
        } catch (error) {
            console.error("Error creando la renta:", error);
            res.status(500).json({ error: "Error creando la renta" });
        }
    };



   // ============================================================
//  generarComprobante  –  Contrato fiel al DOCX de Antiocar
//  Estructura exacta: 2 páginas (Contrato + Inventario)
//  NIT 8100328-9 | Calle 33 #42b-41 Galerías San Diego L.127
// ============================================================

const generarComprobante = async (req, res) => {
  try {
    const { id } = req.params;

    const renta = await prisma.renta.findUnique({
      where: { id: parseInt(id) },
      include: { cliente: true, vehiculo: true },
    });

    if (!renta) return res.status(404).json({ error: "Renta no encontrada" });

    const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=contrato-renta-${renta.id}.pdf`
    );
    doc.pipe(res);

    // ── Constantes de página ─────────────────────────────────
    const W   = 595.28;   // A4 ancho en puntos
    const H   = 841.89;   // A4 alto en puntos
    const L   = 30;       // margen izquierdo
    const R   = W - 30;   // margen derecho
    const CW  = W - 60;   // ancho útil de contenido

    const cliente  = renta.cliente;
    const vehiculo = renta.vehiculo;

    const fmtFecha = (f) => formatDateDMY(f);
    const fmtMoney = (v) =>
      Number(v).toLocaleString("es-CO", {
        style: "currency", currency: "COP", minimumFractionDigits: 0,
      });

    // ── Helpers de dibujo ────────────────────────────────────
    const hLine = (y, x1 = L, x2 = R, color = "#000000") =>
      doc.moveTo(x1, y).lineTo(x2, y).strokeColor(color).lineWidth(0.5).stroke();

    const vLine = (x, y1, y2) =>
      doc.moveTo(x, y1).lineTo(x, y2).strokeColor("#000000").lineWidth(0.5).stroke();

    const rect = (x, y, w, h, fill = null, stroke = "#000000") => {
      doc.lineWidth(0.5).rect(x, y, w, h);
      if (fill) doc.fillAndStroke(fill, stroke);
      else      doc.strokeColor(stroke).stroke();
    };

    // Texto dentro de celda con padding y recorte
    const cellText = (text, x, y, w, opts = {}) => {
      const {
        bold       = false,
        size       = 7.2,
        align      = "left",
        color      = "#000000",
        paddingL   = 3,
        paddingT   = 2,
      } = opts;
      doc
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(size)
        .fillColor(color)
        .text(String(text ?? ""), x + paddingL, y + paddingT, {
          width: w - paddingL - 2,
          align,
          lineBreak: false,
        });
    };

    // ═══════════════════════════════════════════════════════
    //  PÁGINA 1 – CONTRATO
    // ═══════════════════════════════════════════════════════
    let y = 20;

    // ── Logo ─────────────────────────────────────────────────
    const logoPath = path.join(__dirname, "..", "assets", "logo-antiocar.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, W / 2 - 70, y, { width: 140 });
    }
    y = 82;

    // ── Título principal ──────────────────────────────────────
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#000000")
      .text("CONTRATO DE ALQUILER DE VEHICULOS", L, y, {
        width: CW, align: "center",
      });
    y += 16;
    hLine(y);
    y += 7;

    // ── Arrendador ────────────────────────────────────────────
    doc
      .font("Helvetica-Bold").fontSize(7.5)
      .text("ARRENDADOR: ", L, y, { continued: true })
      .font("Helvetica")
      .text(
        "ANTIOCAR Alquiler de vehículos, NIT 8100328 – 9 domiciliado en Medellín.",
        { lineBreak: false }
      );
    y += 10;
    doc
      .font("Helvetica").fontSize(7.5)
      .text("Calle 33 # 42b – 41 Galerías de San Diego local 127", L, y);
    y += 13;

    // ── Arrendatario ──────────────────────────────────────────
    doc
      .font("Helvetica-Bold").fontSize(7.5)
      .text("ARRENDATARIO: ", L, y, { continued: true })
      .font("Helvetica").fontSize(7.5)
      .text(
        `${cliente.nombre ?? "------------------------------"}   identificado con cedula   ${cliente.identificacion ?? "-------------"}`,
        { lineBreak: false }
      );
    y += 12;

    // ── Tabla datos del cliente ───────────────────────────────
    //  Columnas: DIRECCION | APARTAMENTO | UNIDAD RESIDENCIAL O BARRIO
    //            CELULAR   | CORREO      | (vacío)
    const ROW_H = 14;
    const c1 = 170, c2 = 130, c3 = CW - 170 - 130;
    const tblH = ROW_H * 2;
    rect(L, y, CW, tblH);
    hLine(y + ROW_H, L, R);
    vLine(L + c1,       y, y + tblH);
    vLine(L + c1 + c2,  y, y + tblH);

    // Fila 1
    cellText("DIRECCION:",               L,           y, 55,  { bold: true });
    cellText(cliente.direccion  ?? "",   L + 55,      y, c1 - 55);
    cellText("APARTAMENTO:",             L + c1,      y, 68,  { bold: true });
    cellText(cliente.apartamento ?? "",  L + c1 + 68, y, c2 - 68);
    cellText("UNIDAD RESIDENCIAL O BARRIO:", L + c1 + c2, y, c3, { bold: true, size: 6.5 });

    // Fila 2
    cellText("CELULAR:",                 L,            y + ROW_H, 40, { bold: true });
    cellText(cliente.celular ?? "",      L + 40,       y + ROW_H, c1 - 40);
    cellText("CORREO:",                  L + c1,       y + ROW_H, 40, { bold: true });
    cellText(cliente.correo ?? "",       L + c1 + 40,  y + ROW_H, c2 + c3 - 40);

    y += tblH + 9;

    // ── Referencias familiar / personal ───────────────────────
    const halfW = CW / 2;
    const refPersonalX = L + halfW - 26;
    doc
      .font("Helvetica-Bold").fontSize(7.5)
      .text("REFERENCIA FAMILIAR:", L, y);
    doc
      .font("Helvetica-Bold").fontSize(7.5)
      .text("REFERENCIA PERSONAL:", refPersonalX, y);
    y += 10;

    const refRows = [
      ["Nombre:",    cliente.nombreFamiliar,   cliente.nombrePersonal],
      ["Dirección:", cliente.direccionFamiliar, cliente.direccionPersonal],
      ["Teléfono:",  cliente.telefonoFamiliar,  cliente.telefonoPersonal],
    ];

    refRows.forEach(([label, izq, der]) => {
      doc
        .font("Helvetica-Bold").fontSize(7.2)
        .text(label, L, y, { continued: true })
        .font("Helvetica")
        .text("  " + (izq ?? ""), { lineBreak: false });
      doc
        .font("Helvetica-Bold").fontSize(7.2)
        .text(label, refPersonalX, y, { continued: true })
        .font("Helvetica")
        .text("  " + (der ?? ""), { lineBreak: false });
      y += 9;
    });
    y += 7;

    // ── PRIMERA: Objeto del contrato ──────────────────────────
    doc.font("Helvetica-Bold").fontSize(7.5).text("PRIMERA: OBJETO DEL CONTRATO", L, y);
    y += 9;
    doc.font("Helvetica").fontSize(7.2)
       .text("El arrendador se compromete a alquilar el vehículo", L, y);
    y += 9;

    // Mini-tabla VEHICULO / PLACAS / TRÁNSITO
    const VH = 13;
    // Fila: VEHICULO (ancho completo)
    rect(L, y, CW, VH * 2);
    hLine(y + VH, L, R);
    cellText("VEHICULO", L, y, CW, { bold: true, size: 7.5 });
    cellText(vehiculo.nombreVehiculo ?? "", L, y + VH, CW);
    y += VH * 2 + 2;

    // Fila: PLACAS | TRÁNSITO
    rect(L,           y, CW / 2, VH * 2);
    rect(L + CW / 2,  y, CW / 2, VH * 2);
    hLine(y + VH, L, R);
    cellText("PLACAS",          L,           y, CW / 2, { bold: true });
    cellText(vehiculo.placa ?? "",    L,           y + VH, CW / 2);
    cellText("TRÁNSITO",        L + CW / 2,  y, CW / 2, { bold: true });
    cellText(vehiculo.transito ?? "", L + CW / 2,  y + VH, CW / 2);
    y += VH * 2 + 9;

    // ── SEGUNDA: Duración del alquiler ────────────────────────
    doc.font("Helvetica-Bold").fontSize(7.5).text("SEGUNDA: DURACION DEL ALQUILER", L, y);
    y += 9;

    // Tabla: FECHA ENTREGA | HORA | FECHA DEVOLUCIÓN | HORA
    const fc = [105, 60, 110, 60, CW - 105 - 60 - 110 - 60];
    const FH = 13;
    rect(L, y, CW, FH * 2);
    hLine(y + FH, L, R);
    let fx = L;
    fc.forEach(w => { vLine(fx + w, y, y + FH * 2); fx += w; });

    cellText("FECHA ENTREGA",    L,                        y, fc[0], { bold: true });
    cellText("HORA:",            L + fc[0],                y, fc[1], { bold: true });
    cellText("FECHA DEVOLUCION", L + fc[0] + fc[1],        y, fc[2], { bold: true });
    cellText("HORA:",            L + fc[0]+fc[1]+fc[2],    y, fc[3], { bold: true });

    cellText(fmtFecha(renta.fechaEntrega),    L,                      y + FH, fc[0]);
    cellText(renta.horaEntrega    ?? "",       L + fc[0],              y + FH, fc[1]);
    cellText(fmtFecha(renta.fechaDevolucion), L + fc[0] + fc[1],      y + FH, fc[2]);
    cellText(renta.horaDevolucion ?? "",      L + fc[0]+fc[1]+fc[2],  y + FH, fc[3]);

    y += FH * 2 + 5;

    doc.font("Helvetica").fontSize(7.2).fillColor("#000080")
       .text(
         "El arrendatario se compromete a devolver el vehículo en las mismas condiciones que lo recibió",
         L, y, { width: CW, align: "center", underline: true }
       );
    doc.fillColor("#000000");
    y += 13;

    // ── TERCERA: Pago y condiciones económicas ────────────────
    doc.font("Helvetica-Bold").fontSize(7.5)
       .text("TERCERA: PAGO Y CONDICIONES ECONOMICAS", L, y);
    y += 9;
    doc.font("Helvetica").fontSize(7.2)
       .text(
         "El arrendatario se compromete a pagar al arrendador la cantidad de $     por concepto de alquiler, que será pagado de la siguiente manera: ",
         L, y, { width: CW, continued: true }
       )
       .font("Helvetica-Bold")
       .text("PAGO EN EFECTIVO O TRANSFERENCIA BANCARIA POR ANTICIPADO");
    y += 19;

    // Tabla: VALOR DIA | $ | No. DIAS | FORMA DE PAGO | (vacío)
    const pc = [90, 50, 75, 120, CW - 90 - 50 - 75 - 120];
    const PH = 13;
    rect(L, y, CW, PH * 2);
    hLine(y + PH, L, R);
    let px2 = L;
    pc.forEach(w => { vLine(px2 + w, y, y + PH * 2); px2 += w; });

    const pHeaders = ["VALOR DIA", "$", "No. DIAS", "FORMA DE PAGO", ""];
    let px3 = L;
    pHeaders.forEach((h, i) => {
      cellText(h, px3, y, pc[i], { bold: true });
      px3 += pc[i];
    });

    cellText(fmtMoney(renta.valorDia),    L,                   y + PH, pc[0]);
    cellText("",                           L + pc[0],           y + PH, pc[1]);
    cellText(String(renta.numeroDias),    L + pc[0] + pc[1],   y + PH, pc[2]);
    cellText("Efectivo - Transferencia",  L + pc[0]+pc[1]+pc[2], y + PH, pc[3], { align: "center" });

    y += PH * 2 + 7;

    // ── Depósito de seguridad ─────────────────────────────────
    doc.font("Helvetica-Bold").fontSize(7.2)
       .text("Depósito de seguridad: ", L, y, { continued: true })
       .font("Helvetica")
       .text(
         "El ",
         { continued: true }
       )
       .font("Helvetica-Bold")
       .text("arrendatario ", { continued: true })
       .font("Helvetica")
       .text(
         "deberá pagar un depósito de seguridad de ",
         { continued: true }
       )
       .font("Helvetica-Bold")
       .text("$ 1.500.000 ", { continued: true })
       .font("Helvetica")
       .text("si es automóvil o ", { continued: true })
       .font("Helvetica-Bold")
       .text("$ 2.000.000 ", { continued: true })
       .font("Helvetica")
       .text(
         "si es camioneta el cual será reembolsado en su totalidad al finalizar el contrato, siempre y cuando el vehículo no preste ningún tipo de daños, multas o comparendos, ni haya sido involucrado en incidentes.",
         { width: CW }
       );
    y = doc.y + 7;

    // ── Tabla tarjeta de crédito ──────────────────────────────
    const tc = [90, 110, 100, CW - 90 - 110 - 100];
    const TH = 13;
    rect(L, y, CW, TH * 2);
    hLine(y + TH, L, R);
    let tcx = L;
    tc.forEach(w => { vLine(tcx + w, y, y + TH * 2); tcx += w; });

    const tcHdr1 = ["No. TARJETA", "FECHA VENCIMIENTO", "DIGITOS SEGURIDAD", ""];
    const tcHdr2 = ["FRANQUICIA", "VALOR AUTORIZACIO", "No AUTORIZACION", ""];
    let tcx2 = L;
    tcHdr1.forEach((h, i) => { cellText(h, tcx2, y,      tc[i], { bold: true, size: 6.8 }); tcx2 += tc[i]; });
    tcx2 = L;
    tcHdr2.forEach((h, i) => { cellText(h, tcx2, y + TH, tc[i], { bold: true, size: 6.8 }); tcx2 += tc[i]; });

    y += TH * 2 + 10;

    // ── Cláusulas – 2 columnas ────────────────────────────────
    const colW2 = (CW - 8) / 2;
    const colL  = L;
    const colR  = L + colW2 + 8;
    const clSz  = 6.8;

    const clauses = [
      {
        title: "CUARTA: RESPONSABILIDAD POR DAÑOS Y REPARACIONES",
        body:
          "El Arrendatario será responsable por cualquier daño o perdida que sufra el vehículo durante el periodo de alquiler, independientemente de si el daño es causado por su negligencia o por un tercero.\n" +
          "El arrendatario deberá cubrir los costos de reparación o reemplazo del vehículo, y el costo será determinado por el arrendador según la cotización de un taller especializado.\n" +
          "Si llega a presentarse algún daño o accidente inferior a $ 1.500.000 en automóvil gama baja o media según tarifas o si es asciende a la suma de $ 2.000.000 en automóvil gama alta o camionetas, no se recurre a póliza de seguro del vehiculo.",
      },
      {
        title: "QUINTA: HURTO O ROBO DEL VEHICULO",
        body:
          "En caso de hurto o robo del vehículo, el Arrendatario deberá notificar inmediatamente al arrendador y presentar la denuncia ante las autoridades competentes. El arrendatario será responsable por el valor correspondiente al deducible de dicho vehículo, que será determinado según su gama y póliza, más los gastos administrativos y daños asociados a la recuperación o reposición del vehículo.",
      },
      {
        title: "SEXTA: USO DEL VEHICULO",
        body:
          "El Arrendatario se compromete a utilizar el vehículo exclusivamente para fines personales o profesionales. El vehículo no podrá ser utilizado para participar en actividades ilegales o peligrosas, el arrendatario debe cumplir con todas las normas de transito vigentes.\n" +
          "Solo están autorizados a conducir el vehiculo las personas registradas en el momento de la firma del contrato de renta. Si otra persona lo conduce, este quedará automáticamente sin cobertura y el arrendatario deberá asumir toda responsabilidad económica en caso de siniestro.",
      },
      {
        title: "SEPTIMA: PROHIBICIONES Y OBLIGACIONES DEL ARRENDATARIO",
        body:
          "El Arrendatario se compromete a no realizarle modificaciones al vehiculo, a no conducir bajo los efectos del alcohol, drogas o sustancias q alteren su capacidad y a no permitir que personas no autorizadas conduzcan el vehiculo. El arrendatario también deberá mantener el vehiculo en condiciones de uso, incluyendo la revisión de niveles de aceite, presión de llantas y otros aspectos fundamentales para el funcionamiento del vehiculo.",
      },
      {
        title: "OCTAVA: RESPONSABILIDAD POR ACTOS ILICITOS",
        body:
          "El arrendatario será completamente responsable de cualquier acto ilícito que cometa durante el uso del vehiculo, incluyendo, pero no limitado a delitos de tránsito, contravenciones, infracciones o daño a terceros. El arrendatario se compromete a indemnizar al arrendador por cualquier perjuicio derivado de su conducta ilegal, así como a cubrir cualquier sanción económica o multa impuesta por las autoridades competentes.",
      },
      {
        title: "DECIMA: TERMINACION ANTICIPADA",
        body:
          "Cualquiera de las partes podrá dar por terminado el contrato de forma anticipada siempre que se notifique a la otra parte con 2 días de antelación. En caso de terminación anticipada por parte del arrendatario, deberá pagar una penalidad de 30% valor total del alquiler de renta, además cubrir cualquier gasto derivado de la terminación del contrato, en caso de dar por terminado el contrato sin notificar no tendrá reembolso de los días restantes estipulados en el contrato.",
      },
      {
        title: "DECIMA PRIMERA: JURISDICCION Y LEY APLICABLE",
        body:
          "Este contrato se regirá por las leyes de la republica colombiana. En caso de disputas, ambas partes se someten a la jurisdicción de los tribunales competentes de MEDELLIN para la resolución de cualquier conflicto que surja en relación con este contrato",
      },
    ];

    const leftClauses  = clauses.slice(0, 4);
    const rightClauses = clauses.slice(4);

    const drawClausesColumn = (list, startX, startY, maxWidth) => {
      let cy = startY;
      list.forEach(({ title, body }) => {
        doc
          .font("Helvetica-Bold").fontSize(clSz).fillColor("#000000")
          .text(title, startX, cy, { width: maxWidth });
        cy = doc.y + 1;
        doc
          .font("Helvetica").fontSize(clSz)
          .text(body, startX, cy, { width: maxWidth });
        cy = doc.y + 5;
      });
      return cy;
    };

    const clauseStartY = y;
    const endL = drawClausesColumn(leftClauses,  colL, clauseStartY, colW2);
    const endR = drawClausesColumn(rightClauses, colR, clauseStartY, colW2);
    y = Math.max(endL, endR) + 5;

    // ── Declaración de conformidad ────────────────────────────
    doc.font("Helvetica").fontSize(7.2)
       .text(
         "Las partes declaran que han leído y comprendido todas las clausulas del presente contrato, y que lo firman en señal de conformidad.",
         L, y, { width: CW }
       );
    y += 18;

    // ── Firmas – página 1 ─────────────────────────────────────
    const sigY1 = y + 25;
    // Línea firma arrendatario
    doc.moveTo(L, sigY1).lineTo(L + 165, sigY1).strokeColor("#000000").lineWidth(0.5).stroke();
    doc.font("Helvetica-Bold").fontSize(8).text("ARRENDATARIO:", L, sigY1 + 3);

    // Firma / logo arrendador
    const firmaPath = path.join(__dirname, "..", "assets", "firma-antiocar.png");
    if (fs.existsSync(firmaPath)) {
      doc.image(firmaPath, W - 205, sigY1 - 30, { width: 100 });
    }
    doc.font("Helvetica-Bold").fontSize(8)
       .text("ARRENDADOR:",                   W - 205, sigY1 + 3)
       .text("Antiocar Alquiler de Vehículos", W - 205, sigY1 + 13);

    // Nota inferior
    y = sigY1 + 38;
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#000080")
       .text(
         "Cualquier atraso o incumplimiento en los pagos, dejara sin cobertura el seguro ANTIOCAR alquiler de vehículos",
         L, y, { width: CW, align: "center", underline: true }
       );
    doc.fillColor("#000000");

    // ═══════════════════════════════════════════════════════
    //  PÁGINA 2 – INVENTARIO
    // ═══════════════════════════════════════════════════════
    doc.addPage({ size: "A4", margin: 0 });
    y = 20;

    // ── Logo página 2 ─────────────────────────────────────────
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, W / 2 - 70, y, { width: 140 });
    }
    y = 82;

    // ── Título INVENTARIO ─────────────────────────────────────
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000")
       .text("INVENTARIO", L, y, { width: CW, align: "center", underline: true });
    y += 18;

    // ── Tabla de inventario (4 grupos item/X) ─────────────────
    // Cada grupo: columna item (70pt) + columna X (20pt) × 4 = 360pt total
    // Centrada en la página
    const placaInventario = vehiculo?.placa ? `No. PLACAS ${vehiculo.placa}` : "No. PLACAS";
    const invItems = [
      ["LLANTAS",       "BLOQUEO",    "REPUESTO",  "MATRICULA"],
      ["LUCES",         "TAPETES",    "PALANCA",   ""],
      ["ESTOP",         "RADIO CD",   "EXTINTOR",  "SEG. OBLIGATORIO"],
      ["EXPLORADORA",   "CAJA CD",    "BOTIQUIN",  ""],
      ["ANTENA",        "AIRE ACON",  "TACOS",     "CDA"],
      ["ESPEJOS",       "CINTURONES", "PAÑO",      ""],
      ["ESPEJOS ELEC.", "GATO",       "BICELES",   placaInventario],
      ["ALARMA",        "CRUCETA",    "OTROS",     ""],
    ];

    const iItemW = 78;  // ancho celda item
    const iChkW  = 20;  // ancho celda X (check)
    const iGrp   = 4;   // grupos por fila
    const iRowH  = 14;
    const iTableW = (iItemW + iChkW) * iGrp;
    const iStartX = (W - iTableW) / 2;

    // Encabezado con fondo gris
    rect(iStartX, y, iTableW, iRowH, "#d0d0d0");
    let ix = iStartX;
    for (let g = 0; g < iGrp; g++) {
      cellText("ITEM", ix,           y, iItemW, { bold: true, size: 7, align: "center" });
      cellText("X",    ix + iItemW,  y, iChkW,  { bold: true, size: 7, align: "center" });
      if (g < iGrp - 1) {
        vLine(ix + iItemW,          y, y + iRowH);
        vLine(ix + iItemW + iChkW,  y, y + iRowH);
      }
      ix += iItemW + iChkW;
    }
    hLine(y + iRowH, iStartX, iStartX + iTableW);
    y += iRowH;

    // Filas de inventario
    invItems.forEach((row) => {
      rect(iStartX, y, iTableW, iRowH);
      ix = iStartX;
      row.forEach((item, i) => {
        cellText(item, ix,           y, iItemW, { size: 7 });
        cellText(item ? "X" : "", ix + iItemW, y, iChkW,  { size: 7, align: "center" });
        vLine(ix + iItemW,         y, y + iRowH);
        vLine(ix + iItemW + iChkW, y, y + iRowH);
        ix += iItemW + iChkW;
      });
      y += iRowH;
    });
    y += 10;

    // ── Imagen vistas del vehículo ────────────────────────────
    const autosPath = path.join(__dirname, "..", "assets", "vehiculo-vistas.png");
    if (fs.existsSync(autosPath)) {
      doc.image(autosPath, L + 10, y, { width: CW - 20 });
      y += 125;
    } else {
      rect(L + 10, y, CW - 20, 110);
      doc.font("Helvetica").fontSize(8)
         .text("[Vistas del vehículo]", L + 10, y + 50, { width: CW - 20, align: "center" });
      y += 120;
    }

    // ── Pico y Placa + Combustible ────────────────────────────
    const ppX   = L + 10;
    const ppW   = 185;
    const cbX   = ppX + ppW + 35;
    const cbW   = 165;
    const ppRH  = 13;

    // Título de cada sección
    doc.font("Helvetica-Bold").fontSize(8)
       .text("PICO Y PLACA MEDELLIN", ppX, y, { width: ppW, align: "center" });
    doc.font("Helvetica-Bold").fontSize(8)
       .text("COMBUSTIBLE", cbX, y, { width: cbW, align: "center" });
    y += 12;

    // Tabla Pico y Placa (5 días con color)
    const dias = [
      { label: "LUNES",     fill: "#ffcc00" },
      { label: "MARTES",    fill: "#ff6600" },
      { label: "MIERCOLES", fill: "#c0c0c0" },
      { label: "JUEVES",    fill: "#c0c0c0" },
      { label: "VIERNES",   fill: "#ffcc00" },
    ];
    dias.forEach((d, i) => {
      rect(ppX,           y + i * ppRH, ppW / 2, ppRH, d.fill);
      rect(ppX + ppW / 2, y + i * ppRH, ppW / 2, ppRH);
      cellText(d.label, ppX, y + i * ppRH, ppW / 2, { bold: true, size: 7 });
    });

    // Tabla Combustible
    const combustibles = ["4 / 4", "3 / 4", "1 / 2", "1 / 4"];
    combustibles.forEach((c, i) => {
      rect(cbX,           y + i * ppRH, cbW / 2, ppRH);
      rect(cbX + cbW / 2, y + i * ppRH, cbW / 2, ppRH);
      cellText(c, cbX, y + i * ppRH, cbW / 2, { size: 7 });
    });

    y += dias.length * ppRH + 14;

    // ── NOTA ──────────────────────────────────────────────────
    doc.font("Helvetica-Bold").fontSize(8)
       .text("NOTA:", L, y, { underline: true });
    y += 10;
    for (let i = 0; i < 4; i++) {
      hLine(y + i * 14, L, R, "#aaaaaa");
    }
    y += 4 * 14 + 14;

    // ── Firmas – página 2 ─────────────────────────────────────
    const sig2Y = Math.max(y, H - 90);

    doc.moveTo(L, sig2Y - 2).lineTo(L + 165, sig2Y - 2).strokeColor("#000000").lineWidth(0.5).stroke();
    doc.font("Helvetica-Bold").fontSize(8).text("ARRENDATARIO:", L, sig2Y + 2);

    if (fs.existsSync(firmaPath)) {
      doc.image(firmaPath, W - 205, sig2Y - 38, { width: 100 });
    }
    doc.font("Helvetica-Bold").fontSize(8)
       .text("ARRENDADOR:",                   W - 205, sig2Y + 2)
       .text("Antiocar Alquiler de Vehículos", W - 205, sig2Y + 13);

    doc.end();
  } catch (error) {
    console.error("Error generando comprobante:", error);
    res.status(500).json({ error: "Error generando comprobante" });
  }
};




const descargarContratoDocx = async (req, res) => {
    try {
        const { id } = req.params;
        const renta = await prisma.renta.findUnique({
            where: { id: parseInt(id) },
            include: { cliente: true, vehiculo: true },
        });

        if (!renta) {
            return res.status(404).json({ error: "Renta no encontrada" });
        }

        const templatePath = path.join(__dirname, "..", "assets", "contrato-template.docx");
        if (!fs.existsSync(templatePath)) {
            return res.status(500).json({ error: "No se encontró la plantilla del contrato" });
        }

        const docxBuffer = fillContratoTemplate(templatePath, renta);
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=contrato-renta-${renta.id}.docx`
        );
        return res.status(200).send(docxBuffer);
    } catch (error) {
        console.error("Error descargando contrato DOCX:", error);
        return res.status(500).json({ error: "Error descargando contrato DOCX" });
    }
};

const descargarContratoVacioDocx = async (req, res) => {
    try {
        const { id } = req.params;
        const renta = await prisma.renta.findUnique({
            where: { id: parseInt(id) },
            include: { cliente: true, vehiculo: true },
        });

        if (!renta) {
            return res.status(404).json({ error: "Renta no encontrada" });
        }

        const templatePath = path.join(__dirname, "..", "assets", "contrato-template.docx");
        if (!fs.existsSync(templatePath)) {
            return res.status(500).json({ error: "No se encontró la plantilla del contrato" });
        }

        const docxBuffer = fillContratoTemplate(templatePath, renta, { contratoVacio: true });
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="contrato-vacio-renta-${renta.id}.docx"`
        );
        return res.status(200).send(docxBuffer);
    } catch (error) {
        console.error("Error descargando contrato vacío DOCX:", error);
        return res.status(500).json({ error: "Error generando contrato vacío DOCX" });
    }
};

const deleteRenta = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: "ID de renta inválido" });
        }

        const rentaExistente = await prisma.renta.findUnique({ where: { id } });
        if (!rentaExistente) {
            return res.status(404).json({ error: "Renta no encontrada" });
        }

        await prisma.renta.delete({ where: { id } });
        return res.status(200).json({ message: "Renta eliminada correctamente", id });
    } catch (error) {
        console.error("Error eliminando la renta:", error);
        return res.status(500).json({ error: "Error eliminando la renta" });
    }
};

    module.exports = { consultar, registerRenta, generarComprobante, descargarContratoDocx, descargarContratoVacioDocx, deleteRenta };




