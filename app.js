const express = require('express');
const cors = require('cors');
const routerApi = require('./src/routes/index');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000;

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

routerApi(app);

app.listen(port, () => {
  console.log(`Servidor funcionando en http://localhost:${port}`);
});
