const express = require('express');
// const redisModule = require('redis');
const postgresModule = require('pg');
const process = require('process');
const keys = require('./keys.js');

const port = process.env.port || 3000;

const postgresClient = new postgresModule.Pool({
  host: keys.postgresHost,
  port: keys.postgresPort,
  database: keys.postgresDatabase,
  user: keys.postgresUser,
  password: keys.postgresPassword
});

const app = express();

app.get('/', (req, res) => {
  let first_message = `GET coming from port ${port}.`
  let second_message = `environment: ${process.env.PGHOST}.`
  res.send(`${first_message}<br>${second_message}`);
  // res.json(process.env);
});

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
