const express = require('express');
const { consultar, registerRenta  } = require('../controllers/rentaController');

const router = express.Router();

//get
router.get("/", consultar);

//* Insert One
router.post("/", registerRenta);

// //* Uddate
// router.patch('/:id', actualizar);

// // Delete
// router.delete('/:id', eliminar);

module.exports = router;