const express = require('express');
const {
  loginUser,
  registerUser,
  consulta,
  cambiarPassword,
  createTemporaryUser,
  listTemporaryUsers,
  changeTemporaryUserPassword,
  updateTemporaryUserStatus,
  deleteTemporaryUser,
  forgotPassword,
  resetPassword,
} = require('../controllers/usuarioController');
const { authenticateToken, requireRole } = require('../middleware');

const router = express.Router();

//iniciar sesion, autenticar user
router.post("/login", loginUser);
//get usuario autenticado
router.get("/", authenticateToken, consulta);
//cambiar password usuario autenticado
router.put("/cambiar-password", authenticateToken, cambiarPassword);
router.post("/forgot-password", forgotPassword);
router.post("/olvide-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/nuevo-password/:token", resetPassword);

// administración de usuarios temporales (solo admin)
router.post("/temporales", authenticateToken, requireRole("admin"), createTemporaryUser);
router.get("/temporales", authenticateToken, requireRole("admin"), listTemporaryUsers);
router.patch("/temporales/:id/password", authenticateToken, requireRole("admin"), changeTemporaryUserPassword);
router.patch("/temporales/:id/status", authenticateToken, requireRole("admin"), updateTemporaryUserStatus);
router.delete("/temporales/:id", authenticateToken, requireRole("admin"), deleteTemporaryUser);

//crear usuario administrador (solo admin)
router.post("/", authenticateToken, requireRole("admin"), registerUser);

module.exports = router;
