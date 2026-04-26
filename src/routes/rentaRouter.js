const express = require('express');
const { consultar, registerRenta, generarComprobante, descargarContratoDocx } = require('../controllers/rentaController');

const router = express.Router();


//get
router.get("/", consultar);
//* Insert One
router.post("/", registerRenta);
// Descargar comprobante PDF
router.get("/:id/comprobante", generarComprobante);
// Descargar contrato DOCX
router.get("/:id/contrato.docx", descargarContratoDocx);



module.exports = router;