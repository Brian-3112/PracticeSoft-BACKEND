const express = require('express');
const { consultar, registerRenta, descargarContrato  } = require('../controllers/rentaController');

const router = express.Router();

//get
router.get("/", consultar);

//* Insert One
router.post("/", registerRenta);

// //* Uddate
// router.patch('/:id', actualizar);

// // Delete
// router.delete('/:id', eliminar);


//get contrato
router.get("/:id/contrato'", descargarContrato);

module.exports = router;