const express = require('express');
const { consultar, registerCliente, actualizar, eliminar } = require('../controllers/clienteController');

const router = express.Router();

//get
router.get("/", consultar);
//* Insert One
router.post("/", registerCliente);
//* Uddate
router.patch('/:id', actualizar);
// Delete
router.delete('/:id', eliminar);



module.exports = router;