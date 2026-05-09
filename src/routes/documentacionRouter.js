const express = require('express');
const { authenticateToken } = require('../middleware');
const {
    consultarDocumentacion,
    crearDocumentacion,
    descargarArchivoDocumentacion,
} = require('../controllers/documentacionController');

const router = express.Router();

router.get('/', authenticateToken, consultarDocumentacion);
router.post('/', authenticateToken, crearDocumentacion);
router.get('/:id/archivo', authenticateToken, descargarArchivoDocumentacion);

module.exports = router;
