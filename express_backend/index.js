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

postgresClient.connect((err) => {
  if (err){
    console.log(`Error during connection to dabatase: ${err}.`);
  } else {
    console.log('Successfully connected to database.')
  }
});

app.get('/', (req, res) => {
  postgresClient.query('SELECT 1;')
  .then( results => { console.log(`Query results: ${results}`) } )
  .catch( err => { console.log(`Error after trying pg query. Stack:${err.stack}`) } );
});

app.listen(port, () => {
  console.log(`Listening at port ${port}.`);
});
