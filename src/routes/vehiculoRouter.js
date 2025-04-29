const express = require('express');
const { consultar, registerVehiculo, actualizar, eliminar  } = require('../controllers/vehiculoController');


const router = express.Router();

//get
router.get("/", consultar);

//* Insert One
router.post("/", registerVehiculo);

//* Uddate
router.patch('/:id', actualizar);

// Delete
router.delete('/:id', eliminar);

module.exports = router;

