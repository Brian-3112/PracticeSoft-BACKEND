const express = require('express');
const { consultar, registerCliente, actualizar } = require('../controllers/clienteController');

const router = express.Router();

//get
router.get("/", consultar);

//* Insert One
router.post("/", registerCliente);

//* Uddate
router.patch('/:id', actualizar);


module.exports = router;