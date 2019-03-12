const express = require('express');
const redisModule = require('redis');
const {promisify} = require('util'); // promisify, no npm modules required?
// or has this already been included somewhere else? test later

const port = '4000';
const redisDefaultClient = redisModule.createClient({
    host: 'rediscache',
    retry_strategy: () => { return 1000; }
});
const redisSubscriberClient = redisDefaultClient.duplicate();
// const redisSubscriberClient = redisModule.createClient();
const redisPublisherClient = redisDefaultClient.duplicate(); 
// const redisPublisherClient = redisModule.createClient();
const redisResultListenerClient = redisDefaultClient.duplicate();
// const redisResultListenerClient = redisModule.createClient();
const redisGetAsync = promisify(redisDefaultClient.get)
                                .bind(redisDefaultClient);
const redisPublisherHsetAsync = promisify(redisPublisherClient.hset)
                                .bind(redisPublisherClient);
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
    redisDefaultClient.set('some_counter', (++globalCount).toString());
    let someAsyncFunc = async (rs,rj) => {
        let somePromise = new Promise( (resolve, reject) => {
            redisDefaultClient.get('some_counter', (err, result) => {
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
    redisDefaultClient.set('some_other_counter', (++anotherGlobalCount).toString());
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
    redisDefaultClient.set('some_other_counter', (++otherGlobalCount).toString());
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


// PUB AND SUB PART
// note: no calls to routes are being made between the two express instances,
// communication between one express
// instance and another is happening through redis via its sub and pub events
// so redis is sandwiched between two expresses

//[]TODO: change to saving data on a dictionary instead of just publishing it
redisSubscriberClient.on('message', (channelName, desiredValueString) => {
    desiredValue = parseInt(desiredValueString);
    calculatedValue = nonRecursiveFib(desiredValue);
    calculatedValueString = calculatedValue.toString();
    // calculatedValue = recursiveFib(desiredValue);
    //[x] now do async part so that the result is only published
    // after hset is done
    console.log(`About to begin hset with ${desiredValueString}\
:${calculatedValueString}`);
    redisPublisherHsetAsync('calculated_fib_dict', desiredValueString, 
                              calculatedValueString)
    .then( (result) => {
        console.log(`hset('calculated_fib_dict', ${desiredValueString}, \
${calculatedValueString}) done.`);
    })
    .then( (result) => {
        redisPublisherClient.publish('fib_results_channel', 
                                        calculatedValueString);
        console.log(`Subscriber client received a message \
'${desiredValueString}' on \
channel ${channelName} and publisher client published result \
${calculatedValue} on fib_results_channel`);
    })
    .catch( (err) => { console.log(`Error during hset: ${err.stack}`);});
});

redisResultListenerClient.on('message', (channelName, resultString) => {
    console.log(`Result ${resultString} published on ${channelName}.`);
});

// NOTEWORTHY:
// found out that when a client gets put into subscriber mode, the only other 
// actions it may take while listening are the ones that modify the subscription
// such as pub/sub/ping?/quit, and this is interesting because if you try to do
// regular stuff (hint: in other routes) you will transgress this rule
// so a reasonable rule of thumb is using each pub/sub client solely for that
// purpose and nothing else (which in the big scheme of things should be the 
// sensible default anyway)
redisSubscriberClient.subscribe('fib_order_channel');

// client for testing if results are being correctly published
redisResultListenerClient.subscribe('fib_results_channel');

// add a testing route for convenience in generating events hah
app.get('/simulated_publish_trigger', (req, res) => {
    redisPublisherClient.publish('fib_order_channel', '22');
    res.send('Publisher client published random message on fib_order_channel.');
});

// RANDOM MCGUFFIN FUNCTION IMPLEMENTATION
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

// default routes for miscellaneous testing
// they are down here so the url parameter doesn't gobble up the previous routes
// since express parses the routes sequentially
// getting a url parameter:
// requires express, different workflow from node's default way
// url.parse(req.url, true).query

// NOTEWORTHY: specifying a generic :glob at root (as in :number) 
// makes express match (and execute the contents of!) multiple routes 
// even in the case where it has already found an appropriate match previously
// this is probably documented and can be switched in some way but would not
// be a good practice to do anyway, so this surprise is a good one
app.get('/sequential_fib/:number', (req, res) => {
    let numberString = req.params.number;
    let number = parseInt(numberString);
    let resultString = `Calculating fibonacci number sequentially<br>n: ${number.toString()}<br>fib(n): ${nonRecursiveFib(number)}`;
    console.log(resultString);
    res.send(resultString);
});

app.get('/recursive_fib/:number', (req, res) => {
    let numberString = req.params.number;
    let number = parseInt(numberString);
    let resultString = `Calculating fibonacci number recursivelly<br>n: ${number.toString()}<br>fib(n): ${recursiveFib(number)}`;
    console.log(resultString);
    res.send(resultString);
});

app.listen(port, (err) => {
    if(err) {
        console.log(`Express error: ${err}`);
    } else {
        console.log(`Succesful server connection at port ${port}.`);
    }
});
