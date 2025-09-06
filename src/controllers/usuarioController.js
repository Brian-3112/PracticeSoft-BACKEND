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
    const { email, password } = req.body;

    // Verifica si el usuario ya existe
    const existingUser = await prisma.User.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Usuario ya existe" });
    }

    // Hashea la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crea el usuario
    const user = await prisma.User.create({
      data: { email, password: hashedPassword },
    });

    res.status(201).json({ message: "Usuario creado", user });
  } catch (error) {
    res.status(500).json({ error: "Error creando usuario" });
  }
};

module.exports = { loginUser, consulta, registerUser };
