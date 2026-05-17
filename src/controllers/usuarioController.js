const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DEFAULT_TEMPORARY_ALLOWED_MODULES = ["disponibilidad", "clientes", "vehiculos", "rentas"];
const ALL_ALLOWED_MODULES = ["disponibilidad", "dashboard", "clientes", "vehiculos", "rentas", "documentacion", "configuracion"];
const ALLOWED_ROLES = ["admin", "empleado"];

const ADMIN_ALLOWED_MODULES = [...ALL_ALLOWED_MODULES];

const normalizeAllowedModules = (allowedModules, { useDefaultIfMissing = true } = {}) => {
  if (allowedModules === undefined || allowedModules === null) {
    return useDefaultIfMissing ? DEFAULT_TEMPORARY_ALLOWED_MODULES : [];
  }

  if (!Array.isArray(allowedModules)) {
    return useDefaultIfMissing ? DEFAULT_TEMPORARY_ALLOWED_MODULES : [];
  }

  const uniqueModules = [...new Set(allowedModules.map((moduleName) => String(moduleName).trim().toLowerCase()))];
  return uniqueModules.filter((moduleName) => ALL_ALLOWED_MODULES.includes(moduleName));
};

const getAllowedModulesForUser = (user) => {
  if ((user.role || (user.isTemporary ? "empleado" : "admin")) === "admin") return ADMIN_ALLOWED_MODULES;
  if (Array.isArray(user.allowedModules)) return normalizeAllowedModules(user.allowedModules, { useDefaultIfMissing: false });
  return DEFAULT_TEMPORARY_ALLOWED_MODULES;
};

const formatUserResponse = (user) => ({
  id: user.id,
  nombre: user.nombre,
  apellido: user.apellido,
  correo: user.email,
  email: user.email,
  role: user.role || (user.isTemporary ? "empleado" : "admin"),
  isTemporary: Boolean(user.isTemporary),
  isActive: user.isActive !== false,
  allowedModules: getAllowedModulesForUser(user),
  expiresAt: user.expiresAt,
  createdById: user.createdById,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const buildTokenPayload = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role || (user.isTemporary ? "empleado" : "admin"),
  isTemporary: Boolean(user.isTemporary),
  allowedModules: getAllowedModulesForUser(user),
});

//LOGEAR
const loginUser = async (req, res) => {
  try {
    const email = req.body.email || req.body.correo;
    const { password } = req.body;

    if (!email || typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Correo y contraseña son requeridos" });
    }

    // Verifica si el usuario existe
    const user = await prisma.User.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "Acceso denegado\nUsuario deshabilitado" });
    }

    if (user.isTemporary && user.expiresAt && new Date(user.expiresAt) <= new Date()) {
      return res.status(403).json({ message: "Usuario temporal expirado" });
    }

    // Compara la contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "contraseña o correo invalido" });
    }

    const usuario = formatUserResponse(user);

    // Genera un token JWT
    const token = jwt.sign(buildTokenPayload(user), process.env.JWT_SECRET, { expiresIn: "1h" });
    //Envia el token mas los datos al front
    return res.json({
      message: "Ingreso exitoso",
      token,
      usuario,
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      correo: usuario.correo,
      role: usuario.role,
      isTemporary: usuario.isTemporary,
      allowedModules: usuario.allowedModules,
    });

  } catch (error) {
    console.error("Error al ingresar:", error);
    return res.status(500).json({ error: "Error al ingresar" });
  }
};

//getttt
const consulta = async (req, res) => {
  try {
    const userId = req.usuario?.id || req.user?.id;
    const user = await prisma.User.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    return res.json(formatUserResponse(user));

  } catch (error) {
    console.error('Error en consulta:', error);
    return res.status(500).json({ error: "Error obteniendo perfil del usuario" });
  }
};

//crear user admin
const registerUser = async (req, res) => {
  try {
    const { nombre, apellido, password } = req.body;
    const role = req.body.role ? String(req.body.role).trim().toLowerCase() : "admin";
    const email = req.body.email || req.body.correo;

    if (req.usuario && req.usuario.role !== "admin") {
      return res.status(403).json({ message: "No tienes permisos para realizar esta acción" });
    }

    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "El correo es requerido" });
    }

    if (!ALLOWED_ROLES.includes(role) || role !== "admin") {
      return res.status(400).json({ message: "El role permitido para este endpoint es admin" });
    }

    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener mínimo 6 caracteres" });
    }

    const existingUser = await prisma.User.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Usuario ya existe" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.User.create({
      data: {
        nombre,
        apellido,
        email,
        password: hashedPassword,
        role: "admin",
        isTemporary: false,
        isActive: true,
        allowedModules: ADMIN_ALLOWED_MODULES,
      },
    });

    return res.status(201).json({ message: "Usuario creado", usuario: formatUserResponse(user) });
  } catch (error) {
    console.error("Error creando usuario:", error);
    return res.status(500).json({ error: "Error creando usuario" });
  }
};

//cambiar password de usuario autenticado
const cambiarPassword = async (req, res) => {
  try {
    const currentPassword = req.body.currentPassword || req.body.passwordActual;
    const newPassword = req.body.newPassword || req.body.nuevaPassword || req.body.password;

    if (typeof currentPassword !== "string" || !currentPassword) {
      return res.status(400).json({ message: "La contraseña actual es requerida" });
    }

    if (typeof newPassword !== "string" || !newPassword) {
      return res.status(400).json({ message: "La nueva contraseña es requerida" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "La nueva contraseña debe tener mínimo 6 caracteres" });
    }

    const user = await prisma.User.findUnique({
      where: { id: req.usuario?.id || req.user.id },
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: "La contraseña actual no es correcta" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.User.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return res.status(200).json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error('Error cambiando password:', error);
    return res.status(500).json({ error: "Error cambiando contraseña" });
  }
};

const createTemporaryUser = async (req, res) => {
  try {
    const { nombre, apellido, password, expiresAt } = req.body;
    const role = req.body.role ? String(req.body.role).trim().toLowerCase() : "empleado";
    const email = req.body.email || req.body.correo;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "El correo es requerido" });
    }

    if (typeof apellido !== "string" || !apellido.trim()) {
      return res.status(400).json({ message: "El apellido es requerido" });
    }

    if (!ALLOWED_ROLES.includes(role) || role !== "empleado") {
      return res.status(400).json({ message: "El role permitido para usuarios temporales es empleado" });
    }

    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener mínimo 6 caracteres" });
    }

    if (req.body.allowedModules !== undefined && !Array.isArray(req.body.allowedModules)) {
      return res.status(400).json({ message: "allowedModules debe ser una lista" });
    }

    const normalizedRequestedModules = normalizeAllowedModules(req.body.allowedModules, { useDefaultIfMissing: false });
    const requestedModules = Array.isArray(req.body.allowedModules)
      ? req.body.allowedModules.map((moduleName) => String(moduleName).trim().toLowerCase())
      : null;
    if (requestedModules && requestedModules.length !== normalizedRequestedModules.length) {
      return res.status(400).json({ message: `Módulos no permitidos. Permitidos: ${ALL_ALLOWED_MODULES.join(", ")}` });
    }

    const allowedModules = req.body.allowedModules === undefined
      ? DEFAULT_TEMPORARY_ALLOWED_MODULES
      : normalizedRequestedModules;

    const existingUser = await prisma.User.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Usuario ya existe" });
    }

    const expiresAtDate = expiresAt ? new Date(expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAtDate.getTime())) {
      return res.status(400).json({ message: "La fecha de expiración no es válida" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.User.create({
      data: {
        nombre,
        apellido: apellido.trim(),
        email,
        password: hashedPassword,
        role: "empleado",
        isTemporary: true,
        isActive: true,
        allowedModules,
        createdById: req.usuario?.id || null,
        expiresAt: expiresAtDate,
      },
    });

    return res.status(201).json({
      message: "Usuario temporal creado correctamente",
      usuario: formatUserResponse(user),
    });
  } catch (error) {
    console.error("Error creando usuario temporal:", error);
    return res.status(500).json({ error: "Error creando usuario temporal" });
  }
};

const listTemporaryUsers = async (_req, res) => {
  try {
    const users = await prisma.User.findMany({
      where: { isTemporary: true },
      orderBy: { id: "desc" },
    });

    return res.status(200).json(users.map((user) => {
      const formatted = formatUserResponse(user);
      return {
        id: formatted.id,
        nombre: formatted.nombre,
        apellido: formatted.apellido,
        correo: formatted.correo,
        email: formatted.email,
        isActive: formatted.isActive,
        role: formatted.role,
        allowedModules: formatted.allowedModules,
      };
    }));
  } catch (error) {
    console.error("Error listando usuarios temporales:", error);
    return res.status(500).json({ error: "Error listando usuarios temporales" });
  }
};

const changeTemporaryUserPassword = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { newPassword } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID de usuario inválido" });
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ message: "La nueva contraseña debe tener mínimo 6 caracteres" });
    }

    const user = await prisma.User.findUnique({ where: { id } });
    if (!user || user.isTemporary !== true) {
      return res.status(404).json({ message: "Usuario temporal no encontrado" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.User.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return res.status(200).json({ message: "Contraseña del usuario temporal actualizada correctamente" });
  } catch (error) {
    console.error("Error cambiando contraseña temporal:", error);
    return res.status(500).json({ error: "Error cambiando contraseña del usuario temporal" });
  }
};

const updateTemporaryUserStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { isActive } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID de usuario inválido" });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "El estado isActive debe ser booleano" });
    }

    const user = await prisma.User.findUnique({ where: { id } });
    if (!user || user.isTemporary !== true) {
      return res.status(404).json({ message: "Usuario temporal no encontrado" });
    }

    const updatedUser = await prisma.User.update({
      where: { id },
      data: { isActive },
    });

    return res.status(200).json({
      message: "Estado del usuario temporal actualizado correctamente",
      usuario: {
        id: updatedUser.id,
        isActive: updatedUser.isActive,
      },
    });
  } catch (error) {
    console.error("Error actualizando estado temporal:", error);
    return res.status(500).json({ error: "Error actualizando estado del usuario temporal" });
  }
};

const deleteTemporaryUser = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID de usuario inválido" });
    }

    const user = await prisma.User.findUnique({ where: { id } });
    if (!user || user.isTemporary !== true) {
      return res.status(404).json({ message: "Usuario temporal no encontrado" });
    }

    await prisma.User.delete({ where: { id } });
    return res.status(200).json({ message: "Usuario temporal eliminado correctamente", id });
  } catch (error) {
    console.error("Error eliminando usuario temporal:", error);
    return res.status(500).json({ error: "Error eliminando usuario temporal" });
  }
};

module.exports = {
  loginUser,
  consulta,
  registerUser,
  cambiarPassword,
  createTemporaryUser,
  listTemporaryUsers,
  changeTemporaryUserPassword,
  updateTemporaryUserStatus,
  deleteTemporaryUser,
  ADMIN_ALLOWED_MODULES,
  DEFAULT_TEMPORARY_ALLOWED_MODULES,
  ALL_ALLOWED_MODULES,
};
