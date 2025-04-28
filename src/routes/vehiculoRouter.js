const express = require('express');
const { consultar, registerVehiculo, actualizar } = require('../controllers/vehiculoController');


const router = express.Router();

//get
router.get("/", consultar);

//* Insert One
router.post("/", registerVehiculo);

//* Uddate
router.patch('/:id', actualizar);

module.exports = router;

