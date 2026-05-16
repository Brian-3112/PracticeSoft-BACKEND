const express = require('express');
const { consultar, registerRenta, generarComprobante, descargarContratoDocx, descargarContratoVacioDocx, descargarContratoResponsabilidadDocx, deleteRenta } = require('../controllers/rentaController');
const { authenticateToken, requireModuleAccess } = require('../middleware');

const router = express.Router();

router.use(authenticateToken, requireModuleAccess("rentas"));

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
// Descargar certificado de responsabilidad DOCX
router.get("/:id/contrato-responsabilidad.docx", descargarContratoResponsabilidadDocx);
// Eliminar renta
router.delete("/:id", deleteRenta);

module.exports = router;
