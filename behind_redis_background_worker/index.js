const express = require('express');
const redisModule = require('redis');
const {promisify} = require('util'); // promisify, no npm modules required?
// or has this already been included somewhere else? test later

const port = '4000';
const redisClient = redisModule.createClient();
const redisGetAsync = promisify(redisClient.get).bind(redisClient);
const app = express();

var globalCount = 0;
var anotherGlobalCount = 0;
var otherGlobalCount = 0;

// everything is confusing and amorph at this point, however there's probably
// a relatively tidy way to clean this up and make it work by putting the 
// resolve, result, return and async in the appropriate places (and maybe 
// including one await keywork)
app.get('/first_try', (req, res) => {
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
});

// (some time later...)
app.get('/promises', (req, res) => {
    let fullResponse = 'initial response string<br>';
    redisClient.set('some_other_counter', (++anotherGlobalCount).toString());
    // alternatively it becomes similar to the async/await flow,
    // but with one additional callback:
    // let somePromise = redisGetAsync(...);
    // somePromise.then(...)
    redisGetAsync('some_other_counter')
    .then( result => {
        console.log('Redis results:');
        console.log(result);
        fullResponse += `middle part of response: ${result}<br>`;
    }).catch( (err) => { console.log(`Promise rejected: ${err}`); })
    .finally( () => {
        fullResponse += 'final part of the response<br>';
        res.send(fullResponse);
    });
});

app.get('/await', async (req, res) => {
    let fullResponse = 'initial response string<br>';
    redisClient.set('some_other_counter', (++otherGlobalCount).toString());
    try {
        let result = await redisGetAsync('some_other_counter');
        // everything until the end of the block is equivalent to a then block
        console.log('Redis results:');
        console.log(result);
        fullResponse += `middle part of response: ${result}<br>`;
    } catch(err) {
         console.log(`Promise rejected: ${err}`);
    }
    // everything from this part on is semantically equivalent to a finally
    fullResponse += 'final part of the response<br>';
    res.send(fullResponse);
    // a catch could be appended only if you had power of managing the scope in 
    // which this async callback was called. if I had:
    // async f(){...};
    // then I could append a catch at the scope where I was calling f:
    // f().catch((err)=>{...});
});


app.listen(port, (err) => {if(err) console.log(`Express error: ${err}`);});
