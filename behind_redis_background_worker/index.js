const express = require('express');
const redisModule = require('redis');

const port = '4000';
const redisClient = redisModule.createClient();
const app = express();

var globalCount = 0;

app.get('/', (req, res) => {
    // res.send('zzz');
    // console.log('Request information:');
    // console.log(req);
    let fullResponse = 'initial response string<br>';
    redisClient.set('some_counter', (++globalCount).toString());
    let someAsyncFunc = async (rs,rj) => {
        let somePromise = new Promise( (resolve, reject) => {
            redisClient.get('some_counter', (err, result) => {
                if(err) console.log(err.stack)
                else {
                    console.log('Redis results:');
                    console.log(result);
                    fullResponse += `middle part of response: ${result}<br>`;
                    res.send(fullResponse);
                    resolve();
                }
            });
        });
        return somePromise;
    }
    someAsyncFunc().then(()=> console.log('done'));
    fullResponse += 'final part of the response<br>';
    // res.send(fullResponse);
});

app.listen(port, (err) => {if(err) console.log(`Express error: ${err}`);});
