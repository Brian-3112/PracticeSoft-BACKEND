const express = require('express');

const routerUsuario  = require('./usuarioRouter');
const routerVehiculo = require('./vehiculoRouter'); 
const routerCliente =  require('./clienteRouter'); 
const routerRenta = require('./rentaRouter');



// configura las rutas principales de la API
function routerApi(app){
    const router = express.Router();
    // todas las rutas que se definan aquí empezarán con "/api"
    app.use("/api", router)
    // hace que las rutas definidas en 'usuarioRouter' estén disponibles en "/api/usuarios"
    router.use('/usuarios', routerUsuario);
    router.use('/vehiculos', routerVehiculo);
    router.use('/clientes', routerCliente);
    router.use('/rentas', routerRenta);

    
    
}


module.exports = routerApi; 