const jwt = require("jsonwebtoken");


const authenticateToken = (req, res, next) => {
  // Extrae el token del encabezado Authorization
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    // Verifica el token con la clave secreta
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Adjunta los datos del usuario al objeto `req`
    req.user = decoded;

    // Llama a `next()` para continuar hacia la ruta protegida
    next();
  } catch (error) {
    res.status(403).json({ message: "Invalid token" });
  }
};

module.exports = { authenticateToken };
