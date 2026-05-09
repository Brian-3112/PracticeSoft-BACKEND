const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "documentacion");
const UPLOAD_DIR_RELATIVE = path.posix.join("uploads", "documentacion");
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_REQUEST_SIZE = MAX_FILE_SIZE + 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

let ensureDocumentacionTablePromise = null;

const ensureDocumentacionTable = () => {
    if (!ensureDocumentacionTablePromise) {
        ensureDocumentacionTablePromise = prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS \`Documentacion\` (
                \`id\` INTEGER NOT NULL AUTO_INCREMENT,
                \`nombreCliente\` VARCHAR(191) NOT NULL,
                \`cedula\` VARCHAR(191) NOT NULL,
                \`fechaContrato\` DATE NOT NULL,
                \`archivoNombre\` VARCHAR(191) NOT NULL,
                \`archivoMimeType\` VARCHAR(191) NOT NULL,
                \`archivoPath\` VARCHAR(191) NOT NULL,
                \`archivoSize\` INTEGER NULL,
                \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                PRIMARY KEY (\`id\`)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `).catch((error) => {
            ensureDocumentacionTablePromise = null;
            throw error;
        });
    }

    return ensureDocumentacionTablePromise;
};

const parseDateOnly = (value) => {
    const raw = String(value ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;

    const [year, month, day] = raw.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null;
    }
    return date;
};

const formatDate = (value) => {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.slice(0, 10);
    }

    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "";
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const formatDocumento = (documento) => ({
    id: documento.id,
    nombreCliente: documento.nombreCliente,
    cedula: documento.cedula,
    fechaContrato: formatDate(documento.fechaContrato),
    archivoNombre: documento.archivoNombre,
    archivoMimeType: documento.archivoMimeType,
    archivoSize: documento.archivoSize,
    createdAt: documento.createdAt,
    updatedAt: documento.updatedAt,
});

const sanitizeOriginalFilename = (filename) => {
    const baseName = path.basename(String(filename ?? "")).replace(/[\r\n"]/g, "").trim();
    return baseName || "documento";
};

const getSafeExtension = (filename) => {
    const extension = path.extname(filename).toLowerCase();
    if (/^\.[a-z0-9]{1,10}$/.test(extension)) return extension;
    return "";
};

const getBoundary = (contentType) => {
    const match = /(?:^|;)\s*boundary=(?:(?:"([^"]+)")|([^;]+))/i.exec(contentType || "");
    return match ? (match[1] || match[2] || "").trim() : "";
};

const parseContentDisposition = (value) => {
    const params = {};
    String(value || "").replace(/;\s*([^=]+)=(?:"([^"]*)"|([^;]*))/g, (_match, key, quoted, unquoted) => {
        params[key.toLowerCase()] = quoted ?? unquoted ?? "";
        return _match;
    });
    return params;
};

const collectRequestBody = (req) => new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let tooLarge = false;

    req.on("data", (chunk) => {
        total += chunk.length;
        if (total > MAX_REQUEST_SIZE) {
            tooLarge = true;
            return;
        }
        if (!tooLarge) chunks.push(chunk);
    });

    req.on("end", () => {
        if (tooLarge) {
            reject(Object.assign(new Error("El archivo supera el tamaño máximo permitido de 20 MB"), { statusCode: 400 }));
            return;
        }
        resolve(Buffer.concat(chunks));
    });
    req.on("error", reject);
});

const parseMultipartForm = async (req) => {
    const boundaryText = getBoundary(req.headers["content-type"]);
    if (!boundaryText) {
        throw Object.assign(new Error("La solicitud debe ser multipart/form-data"), { statusCode: 400 });
    }

    const body = await collectRequestBody(req);
    const boundary = Buffer.from(`--${boundaryText}`);
    const fields = {};
    let archivo = null;
    let cursor = body.indexOf(boundary);

    while (cursor !== -1) {
        let partStart = cursor + boundary.length;
        if (body.slice(partStart, partStart + 2).toString() === "--") break;
        if (body.slice(partStart, partStart + 2).toString() === "\r\n") partStart += 2;

        const nextBoundary = body.indexOf(boundary, partStart);
        if (nextBoundary === -1) break;

        let partEnd = nextBoundary;
        if (body.slice(partEnd - 2, partEnd).toString() === "\r\n") partEnd -= 2;

        const headerEnd = body.indexOf(Buffer.from("\r\n\r\n"), partStart);
        if (headerEnd !== -1 && headerEnd < partEnd) {
            const headersText = body.slice(partStart, headerEnd).toString("latin1");
            const data = body.slice(headerEnd + 4, partEnd);
            const headers = {};

            headersText.split("\r\n").forEach((line) => {
                const separator = line.indexOf(":");
                if (separator === -1) return;
                headers[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
            });

            const disposition = parseContentDisposition(headers["content-disposition"]);
            if (disposition.name) {
                if (disposition.filename !== undefined) {
                    archivo = {
                        originalName: sanitizeOriginalFilename(disposition.filename),
                        mimeType: headers["content-type"] || "application/octet-stream",
                        buffer: data,
                        size: data.length,
                    };
                } else {
                    fields[disposition.name] = data.toString("utf8").trim();
                }
            }
        }

        cursor = nextBoundary;
    }

    return { fields, archivo };
};

const consultarDocumentacion = async (_req, res) => {
    try {
        await ensureDocumentacionTable();
        const documentos = await prisma.$queryRaw`
            SELECT
                id,
                nombreCliente,
                cedula,
                fechaContrato,
                archivoNombre,
                archivoMimeType,
                archivoSize,
                createdAt,
                updatedAt
            FROM \`Documentacion\`
            ORDER BY createdAt DESC
        `;

        return res.status(200).json(documentos.map(formatDocumento));
    } catch (error) {
        console.error("Error consultando documentación:", error);
        return res.status(500).json({ error: "Error consultando documentación" });
    }
};

const crearDocumentacion = async (req, res) => {
    let archivoPathAbsoluto = null;

    try {
        const { fields, archivo } = await parseMultipartForm(req);
        const nombreCliente = String(fields.nombreCliente ?? "").trim();
        const cedula = String(fields.cedula ?? "").trim();
        const fechaContrato = parseDateOnly(fields.fechaContrato);

        if (!nombreCliente) return res.status(400).json({ error: "El nombre del cliente es requerido" });
        if (!cedula) return res.status(400).json({ error: "La cédula es requerida" });
        if (!fields.fechaContrato) return res.status(400).json({ error: "La fecha del contrato es requerida" });
        if (!fechaContrato) return res.status(400).json({ error: "La fecha del contrato debe tener formato YYYY-MM-DD" });
        if (!archivo || !archivo.size) return res.status(400).json({ error: "El archivo es requerido" });
        if (archivo.size > MAX_FILE_SIZE) return res.status(400).json({ error: "El archivo supera el tamaño máximo permitido de 20 MB" });
        if (!ALLOWED_MIME_TYPES.has(archivo.mimeType)) return res.status(400).json({ error: "Tipo de archivo no permitido" });

        await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });

        const extension = getSafeExtension(archivo.originalName);
        const internalName = `documentacion-${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;
        archivoPathAbsoluto = path.join(UPLOAD_DIR, internalName);
        const archivoPath = path.posix.join(UPLOAD_DIR_RELATIVE, internalName);

        await fs.promises.writeFile(archivoPathAbsoluto, archivo.buffer, { flag: "wx" });

        await ensureDocumentacionTable();
        const documento = await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`
                INSERT INTO \`Documentacion\` (
                    nombreCliente,
                    cedula,
                    fechaContrato,
                    archivoNombre,
                    archivoMimeType,
                    archivoPath,
                    archivoSize,
                    updatedAt
                ) VALUES (
                    ${nombreCliente},
                    ${cedula},
                    ${formatDate(fechaContrato)},
                    ${archivo.originalName},
                    ${archivo.mimeType},
                    ${archivoPath},
                    ${archivo.size},
                    CURRENT_TIMESTAMP(3)
                )
            `;

            const documentos = await tx.$queryRaw`
                SELECT
                    id,
                    nombreCliente,
                    cedula,
                    fechaContrato,
                    archivoNombre,
                    archivoMimeType,
                    archivoPath,
                    archivoSize,
                    createdAt,
                    updatedAt
                FROM \`Documentacion\`
                WHERE id = LAST_INSERT_ID()
                LIMIT 1
            `;

            return documentos[0];
        });

        return res.status(201).json({
            message: "Documento guardado correctamente",
            documento: formatDocumento(documento),
        });
    } catch (error) {
        if (archivoPathAbsoluto) {
            await fs.promises.unlink(archivoPathAbsoluto).catch(() => {});
        }

        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        console.error("Error guardando documentación:", error);
        return res.status(500).json({ error: "Error guardando documentación" });
    }
};

const descargarArchivoDocumentacion = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: "ID de documento inválido" });
        }

        await ensureDocumentacionTable();
        const documentos = await prisma.$queryRaw`
            SELECT
                id,
                nombreCliente,
                cedula,
                fechaContrato,
                archivoNombre,
                archivoMimeType,
                archivoPath,
                archivoSize,
                createdAt,
                updatedAt
            FROM \`Documentacion\`
            WHERE id = ${id}
            LIMIT 1
        `;
        const documento = documentos[0];
        if (!documento) return res.status(404).json({ error: "Documento no encontrado" });

        const archivoPathAbsoluto = path.resolve(process.cwd(), documento.archivoPath);
        const uploadRoot = path.resolve(UPLOAD_DIR);
        if (!archivoPathAbsoluto.startsWith(`${uploadRoot}${path.sep}`)) {
            return res.status(500).json({ error: "Ruta de archivo inválida" });
        }

        await fs.promises.access(archivoPathAbsoluto, fs.constants.R_OK);

        res.setHeader("Content-Type", documento.archivoMimeType);
        res.setHeader("Content-Disposition", `attachment; filename="${sanitizeOriginalFilename(documento.archivoNombre)}"`);
        return res.status(200).sendFile(archivoPathAbsoluto);
    } catch (error) {
        if (error.code === "ENOENT") {
            return res.status(404).json({ error: "Archivo no encontrado" });
        }

        console.error("Error descargando archivo de documentación:", error);
        return res.status(500).json({ error: "Error descargando archivo de documentación" });
    }
};

module.exports = { consultarDocumentacion, crearDocumentacion, descargarArchivoDocumentacion };
