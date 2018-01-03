Skissa & Gissa (server)
=======================

[![Travis CI Build Status](https://travis-ci.org/lrc-se/bth-sg-server.svg?branch=master)](https://travis-ci.org/lrc-se/bth-sg-server)
[![Scrutinizer Build Status](https://scrutinizer-ci.com/g/lrc-se/bth-sg-server/badges/build.png?b=master)](https://scrutinizer-ci.com/g/lrc-se/bth-sg-server/build-status/master)
[![Scrutinizer Code Quality](https://scrutinizer-ci.com/g/lrc-se/bth-sg-server/badges/quality-score.png?b=master)](https://scrutinizer-ci.com/g/lrc-se/bth-sg-server/?branch=master)
[![Scrutinizer Code Coverage](https://scrutinizer-ci.com/g/lrc-se/bth-sg-server/badges/coverage.png?b=master)](https://scrutinizer-ci.com/g/lrc-se/bth-sg-server/?branch=master)


This is the server part of a JavaScript-based re-implementation of the Swedish game **Skissa & Gissa**.

[Go to client](https://github.com/lrc-se/bth-sg-client)


Overview
--------

Skissa & Gissa is a classic game where contestants are given words to draw, while the other players try to guess what the word is. 
In this version of the game for the modern web, gameplay is handled by a central server offering one or more games ("game servers") 
for presumptive players to connect to, with (possibly) varying conditions, such as allotted time for drawing/guessing, number of players, and the wordlist used. 
Players connect through a client frontend in the form of a standalone webpage, in which they are given a graphical interface for drawing, chatting and guessing.


### Server structure

The S&G server is a [Node](https://nodejs.org/) application using [Express](http://expressjs.com/) as a backend framework for handling requests. 
The server offers a simple JSON-based API for initial data retrieval, and all subsequent gameplay-related communication is handled via Web Sockets using a custom, 
S&G-specific protocol (also JSON-based). There also exists the possibility to use [MongoDB](https://www.mongodb.com/) to store high scores, 
which can be installed locally on the server machine using [Docker](https://www.docker.com/).

The Node/Express combo provides a well established, powerful and easy-to-use foundation for any JS-based server application, 
including this one, offering simple patterns to get up and running quickly while still allowing for more advanced systems. 
Web Sockets with a standardized JSON protocol provide a reliable, straightforward way of implementing the realtime functionality required by the game, 
and MongoDB can easily satisfy the application's rather lightweight requirements of data storage. Finally, Docker offers an easy way of installing, 
running and testing all or parts of the application, but it can also be troublesome to set up properly in itself, 
so the S&G server does not actively depend on it.

See the [technical discussion section](#technical-discussion) for more in-depth descriptions of the constituent parts.


#### Limitations

- Neither the server nor the client supports user identification, so high scores are only tied to nicknames repeat occurrences of which may or may not belong to the same person. 
  There is therefore also no guarantee that a specific person's favorite nickname is available at a specific time, since there is no way to restrict its use.
- The server application does not provide an interface, graphical or otherwise, 
  and once it has been started it must be stopped and restarted in its entirety if configuration changes are to be made,
  such as the number or settings of the constituent game servers. Any and all currently connected players will therefore get thrown out if and when this happens.
- Countdown resolution is whole seconds, which means that if a player connects between ticks, his or her *local* countdown will be out of sync with that of the server.
  In any event it is the server-side countdown that provides the *actual* timing governing game flow, so the local countdowns are always approximate.
- Apart from short console messages during startup, the server does not log anything.


### Client structure

See [client repo](https://github.com/lrc-se/bth-sg-client).


Installation
------------

Clone the repo and then proceed to install dependencies:

    npm install


Configuration
-------------

The server application can be configured in several ways.


### Server settings

On startup, the server will look for the file *config.json* in the root directory of the repo, which contains the main settings of the application. 
This file has the following format, in UTF-8:

```javascript
{
    // server name (optional)
    "name": String,
    
    // main server (API) port
    "port": Number,
    
    // player ping timeout, in milliseconds (a falsy value will disable pings)
    "pingTimeout": Number,
    
    // CORS handling for API routes:
    // - strictly true: enable CORS for all requests
    // - array: list of allowed origins to enable CORS for
    // - falsy: disable CORS for all requests
    "cors": Boolean || Array,
    
    // array of game configurations
    "games": Array
}
```

The `games` array defines the parameters for all the separate games the server offers, allowing players to choose a variant they like best 
(or simply one where there is room). Each element in this array is an object with the following format:

```javascript
{
    // game name (optional)
    "name": String,
    
    // game port
    "port": Number,
    
    // minimum number of players to start the game
    "minPlayers": Number,
    
    // maximum number of players to accept into the game
    "maxPlayers": Number,
    
    // available time for drawing/guessing per word, in seconds
    "timeout": Number,
    
    // delay before proceeding to the next word, in seconds
    "delay": Number,
    
    // path to wordlist file
    "wordlist": String,
    
    // high score handling:
    // - truthy: attempt to save high scores to database after each points change
    // - function: callback to invoke after the update completes
    //   (with true argument on success, false argument on failure)
    "saveScores": Boolean || Function
}
```

If no config file is specified in the [startup code](#startup-options), the following default values will be used:

```javascript
{
    port: 1700,
    pingTimeout: 30000,
    cors: true,
    games: [
        {
            port: 1701,
            minPlayers: 2,
            maxPlayers: 10,
            timeout: 60,
            delay: 3,
            wordlist: "./words.json"
        }
    ]
}
```

Also note that if any of the top-level values is missing from the config file, it will be replaced by the corresponding default value given above. 
The only exception is the `games` array, which will cause a fatal error if it is missing or empty.


### Wordlists

The application requires at least one wordlist file to define the words which the players should draw and guess on. 
This is a JSON file consisting of a single array, where each element is a string defining a single word. 
The encoding must be UTF-8 and there must be no leading or trailing spaces in the strings.

Other than that there are no restrictions regarding the name and location of the wordlist file(s), 
as long as the `wordlist` properties in the configuration objects as defined above match the path(s) in question.


### Database connection

If configured to save high scores, the application will attempt to connect to a MongoDB server and update a collection by the name `scores` 
each time points are awarded to players. Players are not required to register or log in, 
so scores are saved based on nickname only, as per the style of arcade machines of old. 
By default the database service will use the connection string `mongodb://localhost:27017/sg`, which requires a running local MongoDB instance, 
but this can be changed by setting the environment variable `SG_DSN` to any valid MongoDB DSN before starting the application.

Any errors encountered during the update process, including not being able to connect at all, will be silently swallowed 
(but see above for the possibility to handle these events by passing a callback in the `saveScores` config property).


Running
-------

The application can be started in several different ways.


### Server only

Start the server with the following command:

    npm start

This will read the configuration as defined above, starting the main ([API](#api)) server and then all defined game servers on their respective ports.


### Server with MongoDB using Docker

To start the server together with a local instance of MongoDB, run the following command:

    npm run start-docker

This will start two separate Docker containers in the background and requires that both Docker and Docker Compose be installed. 
Refer to the first two services defined in *docker-compose.yml* for applicable settings (e.g. ports and data directory).

Stop all running containers with the following command:

    npm run stop-docker
    

### MongoDB only using Docker

Start the MongoDB instance in the foreground, without the S&G server, with the following command:

    npm run mongodb

Again, stop all running containers with `npm run stop-docker`, or use Docker Compose explicitly.


### Startup options

The provided entry script *index.js* exemplifies how to invoke the startup module (*src/sg-startup*), 
whose `start` method is called with an options object with the following format:

```javascript
{
    // directory to use as root for relative paths (defaults to current working directory)
    rootDir: String,
    
    // path to configuration file (omit to use default configuration values)
    configFile: String,
    
    // log level, using module constants (defaults to LOG_MSG):
    // - LOG_NONE: no console output
    // - LOG_ERROR: output errors to console
    // - LOG_MSG: output all messages to console
    logLevel: Number
}
```

The `start` method returns a `Promise` which resolves when all server instances have been started, 
or rejects if there is an error during startup. The argument to the reject function is `true` if the error is fatal.


### Maintenance

To delete all saved high scores, run the following command:

    npm run reset-db
    
As before, use the environment variable `SG_DSN` to change the MongoDB connection string from the local default.

*__NOTE:__ There is __no__ confirmation prompt, so use this function with caution!*


API
---

When running, the main server offers three API routes for use by the client application, all returning data as JSON. 
The response consists of an object containing the data payload in its `data` property if the request was successful, 
or an error message in the `error` property in case of failure.

See the [configuration section](#Configuration) regarding how to set up CORS for these routes.


#### `/api/info`

Returns identifying information about the server:

```javascript
{
    // server name
    "name": String,
    
    // server type (should be "S&G")
    "type": String,
    
    // S&G protocol version
    "version": Number
}
```

#### `/api/games`

Returns currently active games on the server:

```javascript
[
    {
        // game name
        "name": String,
        
        // game port
        "port": Number,
        
        // number of currently connected players
        "numPlayers": Number,
        
        // minimum number of players for the game to start
        "minPlayers": Number,
        
        // maximum number of players accepted into the game
        "maxPlayers": Number,
        
        // available time for drawing/guessing per word, in seconds
        "timeout": Number
    },
    ...
]
```

#### `/api/scores`

Returns a high score list (top ten) of points previously attained by players using the server:

```javascript
[
    {
        // player name
        "nick": String,
        
        // player score
        "points": Number,
        
        // UNIX timestamp, with millisecond precision
        "timestamp": Number
    },
    ...
]
```


Tests
-----

A test suite using [Node Tap](http://www.node-tap.org/) is included, together with [ESLint](https://eslint.org/) for linting. 
Set the `SG_PORT` environment variable to change the base port the test suite uses (defaults to 1701).


### Standard tests

```bash
# run linter
npm run lint

# run test suite
npm run unit

# both of the above, in sequence
npm test
```


### Docker-based tests

Use the following commands to run the full test suite with different version of Node (alpine) using Docker. 
Each container will print out the Node version before launching the test run, for easy confirmation.

```bash
# latest Node
npm run test-docker

# Node 8
npm run test-docker1

# Node 6
npm run test-docker2
```


### Coverage

The standard test commands will generate a coverage report in HTML format in *build/coverage*. To get a Clover report instead, run:

    npm run unit-clover

The suite includes tests for application startup, API routes, wordlist handling, and game flow using Web Sockets. 
Note that there are, as of now, no tests for the database functions, but the module code has been specifically designed with this possibility in mind.


Technical discussion
--------------------

TBD


About
-----

**Type:** School project @[BTH](https://www.bth.se/)  
**License:** MIT  
**Author:** [LRC](mailto:kabc16@student.bth.se)
