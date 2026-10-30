'use strict';

const { createApp } = require('./app');

const port = Number(process.env.PORT) || 3000;
const app = createApp();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`MOTO-TAXI RAPIDINHO API ouvindo em http://localhost:${port}`);
});
