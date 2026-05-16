const express = require('express');

const routerUsuario  = require('./usuarioRouter');
const routerVehiculo = require('./vehiculoRouter'); 
const routerCliente =  require('./clienteRouter'); 
const routerRenta = require('./rentaRouter');
const routerDocumentacion = require('./documentacionRouter');
const routerDashboard = require('./dashboardRouter');



// configura las rutas principales de la API
function routerApi(app){
    const router = express.Router();
    // todas las rutas que se definan aquí empezarán con "/api"
    app.use("/api", router)
    //Definicion de las rutas
    router.use('/usuarios', routerUsuario);
    router.use('/vehiculos', routerVehiculo);
    router.use('/clientes', routerCliente);
    router.use('/rentas', routerRenta);
    router.use('/documentacion', routerDocumentacion);
    router.use('/dashboard', routerDashboard);

    
    
}


module.exports = routerApi; 