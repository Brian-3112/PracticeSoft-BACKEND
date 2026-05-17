const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ADMIN_ALLOWED_MODULES = [
  "disponibilidad",
  "dashboard",
  "clientes",
  "vehiculos",
  "rentas",
  "documentacion",
  "configuracion",
];
const TEMPORARY_ALLOWED_MODULES = ["disponibilidad", "clientes", "vehiculos", "rentas"];

const normalizeModules = (modules = []) => modules.map((m) => String(m).trim().toLowerCase());

const resolveUserRole = (user) => user.role || (user.isTemporary ? "empleado" : "admin");

const getAllowedModulesForUser = (user) => {
  const role = resolveUserRole(user);
  if (role === "admin") return ADMIN_ALLOWED_MODULES;
  if (Array.isArray(user.allowedModules) && user.allowedModules.length > 0) return normalizeModules(user.allowedModules);
  return TEMPORARY_ALLOWED_MODULES;
};

const authenticateToken = async (req, res, next) => {
  // Extrae el token del encabezado Authorization
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token no proporcionado" });
  }

  try {
    // Verifica el token con la clave secreta
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.User.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    if (user.isActive === false) {
      return res.status(403).json({ title: "Acceso denegado", message: "Usuario deshabilitado" });
    }

    if (user.isTemporary && user.expiresAt && new Date(user.expiresAt) <= new Date()) {
      return res.status(403).json({ message: "Usuario temporal expirado" });
    }

    const usuario = {
      id: user.id,
      email: user.email,
      correo: user.email,
      role: resolveUserRole(user),
      isTemporary: Boolean(user.isTemporary),
      isActive: user.isActive !== false,
      allowedModules: getAllowedModulesForUser(user),
    };

    // Adjunta los datos del usuario al objeto `req`
    req.usuario = usuario;
    req.user = usuario;

    // Llama a `next()` para continuar hacia la ruta protegida
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};

const requireRole = (role) => (req, res, next) => {
  const user = req.usuario || req.user;

  if (!user) {
    return res.status(401).json({ message: "No autenticado" });
  }

  if (resolveUserRole(user) === role) {
    return next();
  }

  return res.status(403).json({ message: "No tienes permisos para realizar esta acción" });
};

const requireModuleAccess = (moduleName) => (req, res, next) => {
  const user = req.usuario || req.user;

  if (!user) {
    return res.status(401).json({ message: "No autenticado" });
  }

  const role = resolveUserRole(user);
  const allowedModules = normalizeModules(user.allowedModules || []);

  if (role === "admin") {
    return next();
  }

  if (
    role === "empleado" &&
    allowedModules.includes(String(moduleName).trim().toLowerCase())
  ) {
    return next();
  }

  return res.status(403).json({
    message: "No tienes permisos para acceder a este módulo",
  });
};

module.exports = { authenticateToken, requireRole, requireModuleAccess };
