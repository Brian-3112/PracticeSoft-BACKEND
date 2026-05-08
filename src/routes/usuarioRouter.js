const express = require('express');
const { loginUser, registerUser, consulta, cambiarPassword } = require('../controllers/usuarioController');
const { authenticateToken } = require('../middleware');

const router = express.Router();


//iniciar sesion, autenticar user
router.post("/login", loginUser);
//get
router.get("/", authenticateToken, consulta);
//cambiar password usuario autenticado
router.put("/cambiar-password", authenticateToken, cambiarPassword);
//inser one
router.post("/", registerUser);




module.exports = router;
