const express = require('express');
const cors = require('cors');
const routerApi = require('./src/routes/index');
const { forgotPassword, resetPassword } = require('./src/controllers/usuarioController');

require('dotenv').config();

const app = express();



const port = process.env.PORT || 4000;



///Middlewares
app.use(cors());
app.use(express.json());


app.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'PracticeSoft-BACKEND',
    message: 'API running',
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.post('/forgot-password', forgotPassword);
app.post('/olvide-password', forgotPassword);
app.post('/reset-password', resetPassword);
app.post('/reset-password/:token', resetPassword);
app.post('/nuevo-password/:token', resetPassword);

routerApi(app);

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor funcionando en http://localhost:${port}`);
});
