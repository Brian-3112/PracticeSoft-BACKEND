const express = require('express');
const { consultar, registerRenta, generarComprobante, descargarContratoDocx, descargarContratoVacioDocx, deleteRenta } = require('../controllers/rentaController');

const router = express.Router();


//get
router.get("/", consultar);
//* Insert One
router.post("/", registerRenta);
// Descargar comprobante PDF
router.get("/:id/comprobante", generarComprobante);
// Descargar contrato DOCX
router.get("/:id/contrato.docx", descargarContratoDocx);
// Descargar contrato vacío DOCX
router.get("/:id/contrato-vacio.docx", descargarContratoVacioDocx);
// Eliminar renta
router.delete("/:id", deleteRenta);



module.exports = router;
