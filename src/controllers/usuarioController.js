const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require("@prisma/client");
const { sendPasswordResetEmail } = require('../services/mailService');


const prisma = new PrismaClient();

const RESET_TOKEN_EXPIRY = "20m";

const buildResetLink = (token, req) => {
  const envResetUrl = process.env.FRONTEND_RESET_PASSWORD_URL;
  const frontendPath = process.env.FRONTEND_RESET_PASSWORD_PATH || "/reset-password";
  const requestOrigin = req?.headers?.origin;
  const resetBaseUrl = envResetUrl || (requestOrigin ? `${requestOrigin}${frontendPath}` : null);

  if (!resetBaseUrl) {
    return null;
  }

  const separator = resetBaseUrl.includes("?") ? "&" : "?";
  return `${resetBaseUrl}${separator}token=${encodeURIComponent(token)}`;
};

//LOGEAR
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verifica si el usuario existe
    const user = await prisma.User.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Compara la contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "contraseña o correo invalido" });
    }

    // Genera un token JWT
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });
    //Envia el token mas los datos al front
    res.json({
      message: "Ingreso exitoso",
      token,
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email
    });

  } catch (error) {
    res.status(500).json({ error: "Error al ingresar" });
  }
};

//getttt
const consulta = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.User.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(user);

  } catch (error) {
    console.error('Error en consulta:', error);
    if (error?.name === "JsonWebTokenError" || error?.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token inválido o expirado" });
    }
    res.status(500).json({ error: "Error obteniendo perfil del usuario" });
  }
};


//crear user
const registerUser = async (req, res) => {
  try {
    const { nombre, apellido, email, password } = req.body;

    // Verifica si el usuario ya existe
    const existingUser = await prisma.User.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Usuario ya existe" });
    }

    // Hashea la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crea el usuario
    const user = await prisma.User.create({
      data: { nombre, apellido, email, password: hashedPassword },
    });

    res.status(201).json({ message: "Usuario creado", user });
  } catch (error) {
    res.status(500).json({ error: "Error creando usuario" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    console.log("[FORGOT_PASSWORD] request recibida", { email });

    if (!email) {
      console.warn("[FORGOT_PASSWORD] email faltante en body");
      return res.status(400).json({ message: "El correo es requerido" });
    }

    const user = await prisma.User.findUnique({ where: { email } });
    const genericMessage = "Si el correo está registrado, recibirás un enlace de recuperación";

    if (!user) {
      console.warn("[FORGOT_PASSWORD] email no encontrado en base de datos", { email });
      return res.json({ message: genericMessage });
    }

    const resetSecret = process.env.RESET_PASSWORD_SECRET || process.env.JWT_SECRET;
    const token = jwt.sign(
      { id: user.id, email: user.email, type: "password-reset" },
      resetSecret,
      { expiresIn: RESET_TOKEN_EXPIRY }
    );

    const resetLink = buildResetLink(token, req);
    if (!resetLink) {
      return res.status(500).json({
        message: "No se configuró FRONTEND_RESET_PASSWORD_URL ni se pudo inferir desde Origin"
      });
    }

    const emailInfo = await sendPasswordResetEmail({
      to: user.email,
      resetLink,
      nombre: user.nombre
    });

    console.log("[PASSWORD_RESET_EMAIL]", emailInfo);

    return res.json({ message: genericMessage });
  } catch (error) {
    console.error("Error forgotPassword:", error?.message || error);
    return res.status(500).json({ error: "Error enviando enlace de recuperación" });
  }
};

const resolveResetPayload = (req) => {
  const tokenFromBody = req?.body?.token;
  const tokenFromParams = req?.params?.token;
  const tokenFromQuery = req?.query?.token;

  return {
    token: tokenFromBody || tokenFromParams || tokenFromQuery,
    password: req?.body?.password
  };
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = resolveResetPayload(req);

    if (!token || !password) {
      return res.status(400).json({ message: "Token y nueva contraseña son requeridos" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
    }

    const resetSecret = process.env.RESET_PASSWORD_SECRET || process.env.JWT_SECRET;
    const payload = jwt.verify(token, resetSecret);

    if (payload?.type !== "password-reset" || !payload?.id) {
      return res.status(400).json({ message: "Token de recuperación inválido" });
    }

    const user = await prisma.User.findUnique({ where: { id: payload.id } });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.User.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    return res.json({ message: "Contraseña actualizada exitosamente" });
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      return res.status(400).json({ message: "El enlace de recuperación expiró" });
    }
    if (error?.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Token de recuperación inválido" });
    }
    return res.status(500).json({ error: "Error actualizando la contraseña" });
  }
};

module.exports = { loginUser, consulta, registerUser, forgotPassword, resetPassword };
