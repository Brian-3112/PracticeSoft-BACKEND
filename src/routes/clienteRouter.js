const express = require('express');
const { consultar, registerCliente, actualizar, eliminar } = require('../controllers/clienteController');
const { authenticateToken, requireModuleAccess } = require('../middleware');

const router = express.Router();

router.use(authenticateToken, requireModuleAccess("clientes"));

//get
router.get("/", consultar);
//* Insert One
router.post("/", registerCliente);
//* Uddate
router.patch('/:id', actualizar);
// Delete
router.delete('/:id', eliminar);

module.exports = router;
