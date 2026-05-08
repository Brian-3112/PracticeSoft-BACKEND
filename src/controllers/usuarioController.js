const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require("@prisma/client");


const prisma = new PrismaClient();

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
    const user = await prisma.User.findUnique({
      where: { id: req.user.id },
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
      where: { id: req.user.id },
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

module.exports = { loginUser, consulta, registerUser, cambiarPassword };
