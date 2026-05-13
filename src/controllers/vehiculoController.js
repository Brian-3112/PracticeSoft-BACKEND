const { PrismaClient } = require("@prisma/client");
const AdmZip = require("adm-zip");
const prisma = new PrismaClient();


const DOCX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const sanitizeFilename = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "vehiculo";

const buildSubarriendoDocx = ({ nombreVehiculo, placa, fechaInicio, fechaFin }) => {
  const contractText = `ANTIOCAR alquiler de vehículos da constancia de que el vehículo ${nombreVehiculo} De placas ${placa} estará en nuestra responsabilidad desde la fecha. ${fechaInicio} hasta la ${fechaFin} Dando a conocer que el automotor será devuelto en las mismas condiciones en que el propietario (arrendatario) lo entregué. Para dar constancia del estado del vehículo en el momento de la entrega se anexamos inventario donde se especifica las condiciones del mismo.`;

  const zip = new AdmZip();
  zip.addFile("[Content_Types].xml", Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`, "utf8"));
  zip.addFile("_rels/.rels", Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`, "utf8"));
  zip.addFile("word/_rels/document.xml.rels", Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`, "utf8"));
  zip.addFile("docProps/core.xml", Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Contrato de subarriendo de vehículo</dc:title>
  <dc:creator>PracticeSoft</dc:creator>
  <cp:lastModifiedBy>PracticeSoft</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`, "utf8"));
  zip.addFile("docProps/app.xml", Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>PracticeSoft</Application>
</Properties>`, "utf8"));
  zip.addFile("word/document.xml", Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:jc w:val="both"/></w:pPr>
      <w:r><w:t xml:space="preserve">${escapeXml(contractText)}</w:t></w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`, "utf8"));

  return zip.toBuffer();
};

const getSubarriendoPayload = (body, defaults = {}) => ({
  nombreVehiculo: String(body.nombreVehiculo ?? defaults.nombreVehiculo ?? "").trim(),
  placa: String(body.placa ?? defaults.placa ?? "").trim(),
  fechaInicio: String(body.fechaInicio ?? "").trim(),
  fechaFin: String(body.fechaFin ?? "").trim(),
});

const validateSubarriendoPayload = ({ nombreVehiculo, placa, fechaInicio, fechaFin }) => {
  if (!nombreVehiculo) return "El nombre del vehículo es requerido";
  if (!placa) return "La placa es requerida";
  if (!fechaInicio) return "La fecha de inicio es requerida";
  if (!fechaFin) return "La fecha fin es requerida";
  return null;
};

const sendSubarriendoDocx = (res, payload, filenameSuffix = payload.placa) => {
  const docxBuffer = buildSubarriendoDocx(payload);
  res.setHeader("Content-Type", DOCX_CONTENT_TYPE);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="contrato-subarriendo-${sanitizeFilename(filenameSuffix)}.docx"`
  );
  return res.status(200).send(docxBuffer);
};


// Consultar todos los vehículos
const consultar = async (req, res) => {
  try {
    const vehiculos = await prisma.Vehiculo.findMany();

    // formateo de fechas antes de enviarlas
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

    // Crear un nuevo vehículo
    const NuevoVehiculo = await prisma.Vehiculo.create({
      data: {
        nombreVehiculo,
        placa,
        transito,
        // convertimos el string "YYYY-MM-DD" en Date (medianoche local)
        fechaSOAT: new Date(`${fechaSOAT}T00:00:00`),
        fechaTecno: new Date(`${fechaTecno}T00:00:00`),
        description,
      },
    });

    // Formatear antes de responder para que no se vea con hora en el front
    const vehiculoFormateado = {
      ...NuevoVehiculo,
      fechaSOAT: NuevoVehiculo.fechaSOAT.toISOString().split("T")[0],
      fechaTecno: NuevoVehiculo.fechaTecno.toISOString().split("T")[0],
    };

    res.status(201).json({ message: "Vehículo creado exitosamente", vehiculo: vehiculoFormateado });
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

     // verificar si el vehículo está en uso
     const vehiculoEnUso = await prisma.renta.findFirst({
      where: {
        vehiculoId: Number(id)
      }
    });

    if (vehiculoEnUso) {
      return res.status(403).json({ message: 'El vehiculo tiene rentas asociadas' });
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


const generarContratoSubarriendo = async (req, res) => {
  try {
    const payload = getSubarriendoPayload(req.body || {});
    const validationError = validateSubarriendoPayload(payload);
    if (validationError) return res.status(400).json({ error: validationError });

    return sendSubarriendoDocx(res, payload);
  } catch (error) {
    console.error("Error generando contrato de subarriendo DOCX:", error);
    return res.status(500).json({ error: "Error generando contrato de subarriendo DOCX" });
  }
};

const generarContratoSubarriendoPorVehiculo = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const vehiculo = await prisma.Vehiculo.findUnique({
      where: { id },
      select: { id: true, nombreVehiculo: true, placa: true },
    });

    if (!vehiculo) {
      return res.status(404).json({ message: "Vehículo no encontrado" });
    }

    const payload = getSubarriendoPayload(req.body || {}, vehiculo);
    const validationError = validateSubarriendoPayload(payload);
    if (validationError) return res.status(400).json({ error: validationError });

    return sendSubarriendoDocx(res, payload, vehiculo.placa || payload.placa);
  } catch (error) {
    console.error("Error generando contrato de subarriendo DOCX:", error);
    return res.status(500).json({ error: "Error generando contrato de subarriendo DOCX" });
  }
};


module.exports = { consultar, registerVehiculo, actualizar, eliminar, generarContratoSubarriendo, generarContratoSubarriendoPorVehiculo };
