const express = require('express');
const redisModule = require('redis');
const process = require('process');

const port = process.env.port || 3000;

const app = express();

const redisClient = redisModule.createClient();
redisClient.on('error', function(err){
  console.log(`Error: ${err}`);
});

redisClient.set('some_key', 'some_value');
// redisClient.set('some_key', 'some_value', redisClient.print);
// is the previous output being swallowed whole by some docker composer stream redirection?

var valueFromRedis = 'empty_value';
var someArray = ['another_empty_value'];
app.get('/', (req, res) => {
  // let first_message = `GET coming from port ${port}.`

  // one cannot simply not use a callback in javascript
  // valueFromRedis = redisClient.get('some_key');
  // a callback is necessary because redis exclusively uses an asynchronous interface/API
  redisClient.get('some_key', (err, result) => {
    valueFromRedis = result;
    someArray[0] = result;
    console.log(`Result reply from inside redis callback: ${result}`);
    res.send(`Result reply from inside redis callback: ${result}`);
  });
  console.log(`Value from redis container is only correctly set after the second call to GET /: ${valueFromRedis}`);
  console.log(`Value from redis container is only correctly set after the second call to GET / but using an array for passing: ${someArray[0]}`);
  console.log('This probably happens due to the off-by-one-cycle-esque kind of error of the javascript (or node?) event loop');
  console.log('[]TODO: study the javascript event loop in one of the classical books (you don\'t know js, or rhino book or butterly book)');
});

app.listen(port, () => {
  console.log(`Listening at port ${port}.`);
});
