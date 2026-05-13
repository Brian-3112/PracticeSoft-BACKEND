const express = require('express');
const { consultar, registerVehiculo, actualizar, eliminar, generarContratoSubarriendo, generarContratoSubarriendoPorVehiculo  } = require('../controllers/vehiculoController');

const router = express.Router();



//get
router.get("/", consultar);
//* Insert One
router.post("/", registerVehiculo);
// Descargar contrato de subarriendo DOCX sin guardar datos temporales
router.post("/contrato-subarriendo.docx", generarContratoSubarriendo);
// Descargar contrato de subarriendo DOCX para un vehículo existente sin guardar datos temporales
router.post("/:id/contrato-subarriendo.docx", generarContratoSubarriendoPorVehiculo);
//* Uddate
router.patch('/:id', actualizar);
// Delete
router.delete('/:id', eliminar);





module.exports = router;

