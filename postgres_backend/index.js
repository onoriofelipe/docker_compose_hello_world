const express = require('express');
const pgModule = require('pg');

const app = express();
const port = 3000;
const pgPool = new pgModule.Pool({
  user: 'postgres',
  password: 'examples',
  host: 'localhost',
  database: 'postgres',
  port: '5432'
});

pgPool.connect((err) => {
  if (err){
    console.log(`Error during connection to dabatase: ${err}.`);
  } else {
    console.log('Successfully connected to database.')
  }
  // console.log(`Error stack: ${err.stack}.`);
});


app.get('/', (req, res) => {
  // res.send(`Gobbledigook.`);
  pgPool.query('SELECT 1;', (err, results) => {
    if (err){
      console.log(`Error during query: ${err}.`);
    } else {
      console.log(`Query results: ${results}`);
      res.json(results);
    }
  });
});

app.listen(port, () =>{
  console.log(`Listening at port ${port}.`);
});
