const express = require('express');
const { loginUser, registerUser, consulta} = require('../controllers/usuarioController');

const router = express.Router();


//iniciar sesion, autenticar user
router.post("/login", loginUser);
//get
router.get("/", consulta);
//inser one
router.post("/", registerUser);




module.exports = router;

