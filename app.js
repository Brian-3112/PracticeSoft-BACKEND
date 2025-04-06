const express = require('express');
const cors = require('cors');
const routerApi = require("./src/routes/index");



const app = express();

app.use(express.json());

const port = process.env.PORT || 4000;

 
///Middlewares
app.use(cors());

routerApi(app);




// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor funcionando en http://localhost:${port}`);
});
