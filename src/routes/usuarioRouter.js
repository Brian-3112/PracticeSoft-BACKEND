const express = require('express');
const { loginUser, registerUser, consulta, forgotPassword, resetPassword } = require('../controllers/usuarioController');

const router = express.Router();


//iniciar sesion, autenticar user
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
//get
router.get("/", consulta);
//inser one
router.post("/", registerUser);




module.exports = router;
