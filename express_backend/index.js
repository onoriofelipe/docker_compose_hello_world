const express = require('express');
const redisModule = require('redis');
const {promisify} = require('util');
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
const orderMakingClient = redisModule.createClient();
redisClient.on('error', err => console.log(`Redis error: ${err}`));
const redisClientHgetAsync = promisify(redisClient.hget).bind(redisClient);
const redisClientHgetallAsync =
    promisify(redisClient.hgetall).bind(redisClient);
const orderChannel = 'fib_order_channel';
// no use for this as of now
// const resultsChannel = 'fib_results_channel';

app.get('/', (req, res) => {
    postgresClient.query('SELECT 1;')
    .then( results => {
        console.log(`Query results: ${results}`);
        console.log(results);
        res.json(results); 
    })
    .catch( err => { 
        console.log(`Error after trying pg query. Stack:${err.stack}`
    )});
});

// this API has separate routes for asking a value to be calculated
// and for retrieving the calculated value
app.get('/fib/:number', (req, res) => {
    //[]find out if a separate client is necessary for publishing, likely not 
    orderMakingClient.publish(orderChannel, req.params.number);
    let logMessage = `Fib number for ${req.params.number} requested.`;
    console.log(logMessage);
    res.send(logMessage);
});

// returns all calculated values so far
app.get('/calculated_values', (req, res) => {
    redisClientHgetallAsync('calculated_fib_dict')
    .then( (results) => {
        res.send(`All ordered and calculated values so far:\
${JSON.stringify(results)}`);
    }).catch( (err) => {
        res.send('Some processing error.');
        console.log(`Error: ${err.trace}`);
    });
});

// returns one specific previously calculated value
// note: shady, the client is allowed to request something that has not been
// calculated yet, so this should define some convention for denying such 
// kind of request OR do the convenience of starting to calculate it if
// it hasn't been asked to do that beforehand
app.get('/calculated_values/:number', (req, res) => {
    //[]check if it has been previously calculated via postgres
    //[] if not, then order the calculation and expect the client to remake the
    // request
    // yeah, shady, the frontend should think about the user
    // experience and find some more sane alternative
    // []find out if ajax changes any of this user workflow or not
    redisClientHgetAsync('calculated_fib_dict', req.params.number)
    .then( (results) => {
        res.send(`Calculated ${results} for fib(${req.params.number}).`);
    }).catch( (err) => {
        res.send('Some processing error.');
        console.log(`Error: ${err.trace}`);
    });
});

app.listen(port, () => {
    console.log(`Listening at port ${port}.`);
});
