const express = require('express');
const { consultar, registerRenta, generarComprobante, descargarContratoDocx, deleteRenta } = require('../controllers/rentaController');

const router = express.Router();


//get
router.get("/", consultar);
//* Insert One
router.post("/", registerRenta);
// Descargar comprobante PDF
router.get("/:id/comprobante", generarComprobante);
// Descargar contrato DOCX
router.get("/:id/contrato.docx", descargarContratoDocx);
// Eliminar renta
router.delete("/:id", deleteRenta);



module.exports = router;
