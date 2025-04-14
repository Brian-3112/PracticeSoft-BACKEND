const express = require('express');
const { consultar } = require('../controllers/vehiculoController');

const router = express.Router();

//get
router.get("/", consultar);

module.exports = router;

