const express = require('express');
const { consultar, registerRenta, generarComprobante    } = require('../controllers/rentaController');

const router = express.Router();


//get
router.get("/", consultar);
//* Insert One
router.post("/", registerRenta);
// Descargar comprobante PDF
router.get("/:id/comprobante", generarComprobante);



module.exports = router;