const express = require('express');

const routerUsuario  = require('./usuarioRouter');




function routerApi(app){
    const router = express.Router();
    app.use("/api", router)
    router.use('/usuarios', routerUsuario);
    
}


module.exports = routerApi; 