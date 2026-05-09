const express = require('express');
const { authenticateToken } = require('../middleware');
const {
    consultarDocumentacion,
    crearDocumentacion,
    descargarArchivoDocumentacion,
    eliminarDocumentacion,
} = require('../controllers/documentacionController');

const router = express.Router();

router.get('/', authenticateToken, consultarDocumentacion);
router.post('/', authenticateToken, crearDocumentacion);
router.get('/:id/archivo', authenticateToken, descargarArchivoDocumentacion);
router.delete('/:id', authenticateToken, eliminarDocumentacion);

module.exports = router;
