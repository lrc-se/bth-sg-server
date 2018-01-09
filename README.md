Skissa & Gissa (server)
=======================

[![Travis CI Build Status](https://travis-ci.org/lrc-se/bth-sg-server.svg?branch=master)](https://travis-ci.org/lrc-se/bth-sg-server)
[![Scrutinizer Build Status](https://scrutinizer-ci.com/g/lrc-se/bth-sg-server/badges/build.png?b=master)](https://scrutinizer-ci.com/g/lrc-se/bth-sg-server/build-status/master)
[![Scrutinizer Code Quality](https://scrutinizer-ci.com/g/lrc-se/bth-sg-server/badges/quality-score.png?b=master)](https://scrutinizer-ci.com/g/lrc-se/bth-sg-server/?branch=master)
[![Scrutinizer Code Coverage](https://scrutinizer-ci.com/g/lrc-se/bth-sg-server/badges/coverage.png?b=master)](https://scrutinizer-ci.com/g/lrc-se/bth-sg-server/?branch=master)


This is the server part of a JavaScript-based online re-implementation of the Swedish game **Skissa & Gissa**.

[Go to client](https://github.com/lrc-se/bth-sg-client)


Table of contents
-----------------

1. [**Overview**](#overview)
    - [Server structure](#server-structure)
        - [Limitations](#limitations)
    - [Client structure](#client-structure)
2. [**Installation**](#installation)
3. [**Configuration**](#configuration)
    - [Server settings](#server-settings)
    - [Wordlists](#wordlists)
    - [Database connection](#database-connection)
4. [**Running**](#running)
    - [Server only](#server-only)
    - [Server with MongoDB using Docker](#server-with-mongodb-using-docker)
    - [MongoDB only using Docker](#mongodb-only-using-docker)
    - [Startup options](#startup-options)
    - [Maintenance](#maintenance)
5. [**API**](#api)
6. [**Testing**](#testing)
    - [Standard tests](#standard-tests)
    - [Docker-based tests](#docker-based-tests)
    - [Coverage](#coverage)
7. [**Technical discussion**](#technical-discussion)
    - [Architecture](#architecture)
        - [Modularity](#modularity)
            - [Event system](#event-system)
            - [Testability & integration](#testability--integration)
        - [Configurability](#configurability)
    - [Web Sockets](#web-sockets)
    - [Custom module: ws-server](#custom-module-ws-server)
    - [Database](#database)
    - [Continuous integration services](#continuous-integration-services)
    - [Tests](#tests)
8. [**About**](#about)


Overview
--------

Skissa & Gissa is a classic game where contestants are given words to draw, while the other players try to guess what the word is. 
In this version of the game for the modern web, gameplay is handled by a central server offering one or more games ("game servers") 
for presumptive players to connect to, with (possibly) varying conditions, such as allotted time for drawing/guessing, number of players, and the wordlist used. 
Players connect through a client SPA in the form of a standalone webpage, in which they are given a graphical interface for drawing, chatting and guessing.

Note that all texts intended for players are in Swedish, even though English is used for all code, comments and internal log messages.


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

See the [technical discussion section](#technical-discussion) for more in-depth descriptions of the constituent parts, and the separate [protocol specification](./protocol.md) 
for more information on the protocol format.


#### Limitations

- Neither the server nor the client supports user identification, so high scores are only tied to nicknames repeat occurrences of which may or may not belong to the same person. 
  There is therefore also no guarantee that a specific person's favorite nickname is available in a specific game at a specific time, since there is no way to restrict its use.

- The server application does not provide an interface, graphical or otherwise, 
  and once it has been started it must be stopped and restarted in its entirety if configuration changes are to be made,
  such as the number or settings of the constituent game servers. Any and all currently connected players will therefore get thrown out if and when this happens.

- Countdown resolution is whole seconds, which means that if a player connects between ticks, his or her *local* countdown will be out of sync with that of the server.
  In any event it is the server-side countdown that provides the *actual* timing governing game flow, so the local countdowns are always approximate.

- Each game run by the server requires its own port, plus another for the API. 
  Even if the games use Web Sockets exclusively, the API cannot coexist on the same port with one of them because they utilize different listeners.

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
    
    // whether to attempt to save high scores to database after each points change
    "saveScores": Boolean
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
(but see [startup options](#startup-options) for the possibility to handle these events by defining a callback).


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

The provided entry script *index.js* exemplifies how to invoke the startup module (*src/sg-setup.js*), 
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
    logLevel: Number,
    
    // callback to execute upon completion of high score update, if enabled (optional)
    // (receives true argument on success, false argument on failure)
    scoreCallback: Function
}
```

The `start` method returns a `Promise` which resolves when all server instances have been started, 
with the callback receiving an object containing non-fatal error messages for any individual game servers that failed to start. 
The keys of this object map to the 1-based indices of the game servers that caused the errors, 
and the corresponding values contain the error messages in question. 
In case of a fatal error during startup, the `Promise` rejects with an error message as argument.


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

See the [configuration section](#configuration) regarding how to set up CORS for these routes.


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
        "score": Number,
        
        // UNIX timestamp, with millisecond precision
        "timestamp": Number
    },
    ...
]
```


Testing
-------

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

Use the following commands to run the full test suite with different versions of Node (alpine) using Docker. 
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
Note that there are, as of now, no tests for the database functions (see more below).


Technical discussion
--------------------

The server application is wholly separate from its client counterpart and can be deployed on any Node-capable web server, 
provided that said server supports native Web Sockets (HTTP upgrade) and is able to listen on the (public) ports defined in the configuration. 
At the same time there is nothing stopping a server owner to host and run the two applications together, but it is not *required* – 
any S&G server can respond to any S&G client, provided that the former has enabled CORS when applicable.


### Architecture

The application is highly modularized and uses ES6 syntax (mostly in the form of shorthand) where available, 
but stays well clear of the *fake classes* that have been bolted on to the language despite going against the very nature of JavaScript; 
instead the module code is based on factory functions and prototypes.

#### Modularity

The majority of the included modules have been written in such a way as to instantiate independent objects, 
while still making use of shared functions (but not shared data) where appropriate. 
As a result the server can easily run an arbitrary number of games in parallel by simply instantiating a series of independent game runner objects, 
which in turn instantiate independent socket listeners, and so on.

##### Event system

The `sg-server` module, which handles the Web Sockets connections, is hooked into [Node's event system](https://nodejs.org/api/events.html), 
and communicates with the game runner instances (`sg-game`) by emitting events on itself. 
This prevents tight two-way coupling between these components and facilitates separation of concerns, 
since the socket listener need not be aware of what consequences its events have, or who (if anyone) listens to them in turn. 
All game logic can therefore be kept in `sg-game`, with only lower-level protocol responses being handled directly by `sg-server`.

##### Testability & integration

Keeping the components independent, within certain limits, also facilitates testing, 
and specific care has been taken to enable external access points for functionality and data that should be exposed to whatever surrounding scope has use of them – 
which may or may not be a test environment.

One example of this is the `sg-setup` module, which is in charge of launching the full S&G server application and enables the caller to be notified of 
the completion status of the startup procedure through a `Promise`-based series of invocations. 
Another example is the possibility to define a callback for the high score update procedure, which is also `Promise`-based, 
thereby enabling the calling code to determine whether the update succeeded or not.

#### Configurability

A central tenet of the S&G server is the ability to easily change its behavior through configuration settings. 
This applies both to the main configuration file, which exposes a wide range of options, and to the various factory functions, 
which typically accept one or more option objects that can be used to further fine-tune the workings of the application.

The existence of the `sg-setup` module is a logical consequence of this, as well as the testability concerns outlined above, 
putting more power in the hands of the developer without the need to delve deeper into the code. 
On a higher level, the file-based configuration, including custom wordlist files, 
provides a simple way to set up the main server and should suffice in the typical use case.


### Web Sockets

The native Web Sockets API now available to browsers provides a perfect way for handling the realtime requirements of the game, 
completely removing the need for polling (long or otherwise) or other shaky push techniques. 
The server application needs to send and receive updates as soon as they occur – with regard to both drawing, chatting/guessing and game flow events – 
which the custom JSON protocol makes it easy to do in a uniform manner while still allowing the use of differing data formats *within* the payload. 
All in all, basing the game on Web Sockets has been very satisfactory.


### Custom module: ws-server

The server application uses a custom module called `ws-server`, which is a wrapper around the `Server` object of the [`ws` module](https://www.npmjs.com/package/ws), 
providing a simple interface for handling Web Sockets connections, including automatic ping timeouts.

Of particular interest is that the module maintains a connection-specific "client object" that is passed to all event handlers, 
which the S&G server uses both to store player data and to manage the player's connection, since the object provides direct access to the underlying socket. 
By relying on the client object all player information is kept in one place, without the need to extend the actual socket object and/or create circular references.

The `ws-server` module is general in its design and can be used in a wide range of server applications based on Web Sockets, 
so it is not in any way restricted to this project. It has therefore been made [publically available through `npm`](https://www.npmjs.com/package/ws-server), 
which is the de facto go-to place for JavaScript modules, offering a simple, uniform way of managing dependencies which is crucial to any project of appreciable size. 
Now, if it were just [more efficient](https://pbs.twimg.com/media/C3SOI-_WAAAM4Js.jpg)...


### Database

The use of MongoDB to persist scores turned out to be a good fit, mainly because of the almost complete lack of database setup needed. 
Neither tables nor schemata need to be created beforehand; the `scores` collection will instead spring into existence the first time an access attempt is made, 
whether for reading or writing. Furthermore the MongoDB JavaScript driver provides a very simple way of performing increment upserts, 
packing into a single function call something which would usually require several sequential SQL operations in a relational database. 
So, a good fit indeed.

That said, the use cases for NoSQL databases remain fewer and more specific than those for traditional relational databases, 
and it is unlikely that the latter will be going the way of the dinosaurs any time soon. 
Their strength is, obviously, in *relational* applications, which, as is or should be commonly known, abound on the Internet.

On a technical level the application uses two services that abstract away large parts of the required boilerplate involved in using the MongoDB driver – 
one to handle the database connection as such, which is in turn used by the other to handle collection operations – 
but only utilizes a part of what they have to offer for the simple reason that its actual demands are quite slim here.


### Continuous integration services

The server repo is tied to two external services: [Travis CI](https://travis-ci.com/), which handles automated tests with three different versions of Node, 
and [Scrutinizer](https://scrutinizer-ci.com/), which provides code quality analyses and code coverage stats. 
These services have been selected due to ease of use and provided functionality, plus the fact that both can use GitHub for login purposes, 
eliminating the need to register for yet another couple of online accounts. Scrutinizer also has the advantage that it can generate the code coverage report by itself, 
and does not require a connection with another service to do it.

Travis CI provides a simple way to ascertain that the application passes all tests and has mostly been rock solid, 
but at times its build process fails due to transient errors not related to the actual repo. Scrutinizer is the more valuable tool of the two, 
providing useful feedback for issues that may not directly impact the functioning of the code, but which are still to be considered bugs.

Still, Scrutinizer has a tendency to misfire at times, identifying issues which are not *actually* errors, but rather a result of the tool's not being aware of the larger picture – 
intentional console output in a CLI, for example. Its grounds for grading files and functions are also far from clear, 
and it has often been the case that a seemingly innocent piece of code has been relegated to **B** status for no *apparent* reason, pulling the total grade down, 
while other more conspicuous-looking pieces remain on the **A** level. Given these constraints, the code quality score awarded must be described as quite sufficient.


### Tests

Node Tap has been chosen as the test runner for much the same reasons as the author of that tool outlines on its [start page](http://www.node-tap.org/), 
but this quote kind of says it all:

> *JavaScript tests should be JavaScript programs, not English-language poems with weird punctuation.*

It is also lightweight and quick and requires no external tools or transpilation, but can be augmented with things like custom assertion libraries if one wants to. 
Node Tap also comes with [Istanbul](https://istanbul.js.org/) (in the form of [`nyc`](https://www.npmjs.com/package/nyc)) included, 
so code coverage reporting is very simple to get up and running without any further ado.

Due to the modular nature of the application described above, high code coverage levels can be achieved without too much hassle. 
To wit, many of the components can be tested both on their own and in conjunction with each other, which the included test suite illustrates. 
The trickiest part to test is the proper progression of a game round, which necessitates careful state management and a strict adherence to the expected sequence of protocol commands – 
all handled by actual Web Sockets – but the result is a series of tests that should be able to pinpoint breaking changes in the general game flow.

Database tests have, unfortunately, not been implemented at this time for the simple reason that *time* to set them up properly is precisely what has been missing. 
The high score functions – including the API route – are therefore not covered by the test suite, 
but as previously mentioned the module code has been specifically designed with this possibility in mind.

It should also be mentioned that, in general, ensuring that all intended *functionality* is tested is more important than merely reaching a high coverage score. 
Just the fact that many or all *code paths* have been traversed does not necessarily mean that the application actually works as expected, 
since there are many, many possible combinations of internal state that may take much the same logic paths, 
but may equally well change the outcome depending on just what is contained in said state. In other words, 
high code coverage in tests in and of itself is not a guarantee for correct code and should not be taken as such – it's just a number.


About
-----

**Type:** School project @[BTH](https://www.bth.se/)  
**License:** CC-BY-NC-SA-4.0  
**Author:** [LRC](mailto:kabc16@student.bth.se)
