const express = require('express');
const { loginUser, registerUser } = require('../controllers/usuarioController');

const router = express.Router();

//iniciar sesion, autenticar user
router.post("/login", loginUser);
//inser one
router.post("/", registerUser);

module.exports = router;

