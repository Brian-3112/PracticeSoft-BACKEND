const express = require('express');
const { consultar, registerCliente } = require('../controllers/clienteController');

const router = express.Router();

//get
router.get("/", consultar);

//* Insert One
router.post("/", registerCliente);


module.exports = router;