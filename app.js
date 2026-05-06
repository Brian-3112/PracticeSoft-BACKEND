const express = require('express');
const cors = require('cors');
const routerApi = require("./src/routes/index");

require('dotenv').config();

const app = express();

app.use(express.json());

const port = process.env.PORT || 4000;


app.get("/debug-users", async (req, res) => {
    const users = await prisma.user.findMany();
    res.json(users);
});
///Middlewares
app.use(cors());

routerApi(app);




// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor funcionando en http://localhost:${port}`);
});
