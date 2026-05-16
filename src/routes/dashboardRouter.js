const express = require('express');
const { authenticateToken, requireRole } = require('../middleware');

const router = express.Router();

router.use(authenticateToken, requireRole("admin"));

router.get('/', (_req, res) => {
  return res.status(200).json({ message: "Acceso autorizado al dashboard" });
});

module.exports = router;
