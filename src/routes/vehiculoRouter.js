const express = require('express');
const { consultar, registerVehiculo } = require('../controllers/vehiculoController');


const router = express.Router();

//get
router.get("/", consultar);

//* Insert One
router.post("/", registerVehiculo);

module.exports = router;

