const express = require('express');
const redisModule = require('redis');
const {promisify} = require('util'); // promisify, no npm modules required?
// or has this already been included somewhere else? test later

const port = '4000';
const redisSubscriberClient = redisModule.createClient();
const redisPublisherClient = redisModule.createClient();
const redisGetAsync = promisify(redisSubscriberClient.get).bind(redisSubscriberClient);
const app = express();

var globalCount = 0;
var anotherGlobalCount = 0;
var otherGlobalCount = 0;

// ASYNC REVIEW PART

// everything is confusing and amorph at this point, however there's probably
// a relatively tidy way to clean this up and make it work by putting the 
// resolve, result, return and async in the appropriate places (and maybe 
// including one await keywork)
app.get('/first_try', (req, res) => {
    let fullResponse = 'initial response string<br>';
    redisSubscriberClient.set('some_counter', (++globalCount).toString());
    let someAsyncFunc = async (rs,rj) => {
        let somePromise = new Promise( (resolve, reject) => {
            redisSubscriberClient.get('some_counter', (err, result) => {
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
    redisSubscriberClient.set('some_other_counter', (++anotherGlobalCount).toString());
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
    redisSubscriberClient.set('some_other_counter', (++otherGlobalCount).toString());
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

// default routes for miscellaneous testing
// they are down here so the url parameter doesn't gobble up the previous routes
// since express parses the routes sequentially
// getting a url parameter:
// requires express, different workflow from node's default way
// url.parse(req.url, true).query
app.get('/:number', (req, res) => {
    let numberString = req.params.number;
    let number = parseInt(numberString);
    let resultString = `Calculating fibonacci number sequentially<br>n: ${number.toString()}<br>fib(n): ${nonRecursiveFib(number)}`;
    console.log(resultString);
    res.send(resultString);
});

app.get('/recursive/:number', (req, res) => {
    let numberString = req.params.number;
    let number = parseInt(numberString);
    let resultString = `Calculating fibonacci number recursivelly<br>n: ${number.toString()}<br>fib(n): ${recursiveFib(number)}`;
    console.log(resultString);
    res.send(resultString);
});


// PUB AND SUB PART
// note: no calls to routes are being made, communication between one express
// instance and another is happening through redis via its sub and pub events
/*
//[]TODO: change to saving data on a dictionary instead of just publishing it
redisSubscriberClient.sub('fib_channel');
redisSubscriberClient.on('message', 'fib_channel', (stringValue) => {
    desiredValue = parseInt(stringValue);
    calculatedValue = nonRecursiveFib(desiredValue);
    // calculatedValue = recursiveFib(desiredValue);
    redisPublisherClient.pub('fib_channel', calculatedValue.toString());
});
*/
function recursiveFib(n){
    if(n == 0 || n == 1){
        return 1;
    }
    return recursiveFib(n-1) + recursiveFib(n-2);
}

function nonRecursiveFib(n){
    let a = 0;
    let b = 1;
    for( i = 0; i <= n; ++i ){
        b = a+b;
        a = b-a;
    }
    return b;
}

// n   0   1   2   3   4   5   6
// r   1   1   2   3   5   8   13
// c   1   1   1+1 1+2 2+3 3+5 5+8

app.listen(port, (err) => {if(err) console.log(`Express error: ${err}`);});
