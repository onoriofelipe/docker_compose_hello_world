const express = require('express');
const redisModule = require('redis');
const postgresModule = require('pg');
const process = require('process');
const keys = require('keys.js');

const port = 80;

const postgresClient = new postgresModule.Pool({
  host: keys.postgresHost,
  port: keys.postgresPort,
  database: keys.postgresDatabase,
  user: keys.postgresUser,
  password: keys.postgresPassword
});

const app = express();

app.listen(port, () => {
  console.log(`Listening at port ${port}.`);
});

// [x] javascript string interpolation
// [x] require import export difference
// [] npm modules:
//   [x]process
//   []redis
//     []https://www.npmjs.com/package/redis
//   [x]postgres
//     [x]https://www.npmjs.com/package/pg
//     [x]https://node-postgres.com/
// [x] global.process
