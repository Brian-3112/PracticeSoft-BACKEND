const express = require('express');
const { authenticateToken, requireRole } = require('../middleware');
const {
    consultarDocumentacion,
    crearDocumentacion,
    descargarArchivoDocumentacion,
    eliminarDocumentacion,
} = require('../controllers/documentacionController');

const router = express.Router();

router.use(authenticateToken, requireRole("admin"));

router.get('/', consultarDocumentacion);
router.post('/', crearDocumentacion);
router.get('/:id/archivo', descargarArchivoDocumentacion);
router.delete('/:id', eliminarDocumentacion);

module.exports = router;
