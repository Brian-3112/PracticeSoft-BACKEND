const express = require('express');
const { consultar, registerVehiculo, actualizar, eliminar  } = require('../controllers/vehiculoController');
const { authenticateToken, requireModuleAccess } = require('../middleware');

const router = express.Router();

router.use(authenticateToken, requireModuleAccess("vehiculos"));

//get
router.get("/", consultar);
//* Insert One
router.post("/", registerVehiculo);
//* Uddate
router.patch('/:id', actualizar);
// Delete
router.delete('/:id', eliminar);

module.exports = router;
