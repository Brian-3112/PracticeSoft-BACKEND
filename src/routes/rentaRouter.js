const express = require('express');
const { consultar, registerRenta, generarComprobante    } = require('../controllers/rentaController');

const router = express.Router();

//get
router.get("/", consultar);

//* Insert One
router.post("/", registerRenta);

// //* Uddate
// router.patch('/:id', actualizar);

// // Delete
// router.delete('/:id', eliminar);

// Descargar comprobante PDF
router.get("/:id/comprobante", generarComprobante);




module.exports = router;