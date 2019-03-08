const express = require('express');
const redisModule = require('redis');
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

const redisClient = redisModule.createClient();
redisClient.on('error', err => console.log(`Redis error: ${err}`));
redisClient.set('some_key', 'some_value');
redisClient.get('some_key', (err, result) => console.log(`Redis result: ${result}`));

app.get('/', (req, res) => {
  postgresClient.query('SELECT 1;')
  .then( results => {
    console.log(`Query results: ${results}`);
    console.log(results);
    // res.send(`Query results: ${results}`); 
    // res.json(`Query results: ${results}`); 
    res.json(results); 
  })
  .catch( err => { console.log(`Error after trying pg query. Stack:${err.stack}`) } );
});

app.listen(port, () => {
  console.log(`Listening at port ${port}.`);
});
