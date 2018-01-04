/**
 * S&G server application setup.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const SgApp = require("./sg-app");
const SgGame = require("./sg-game");


// default config
let config = {
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
};

// Express app instance
let app;

// main HTTP server
let server;

// root directory
let rootDir;

// log level
let logLevel;


/**
 * Module interface.
 */
let SgSetup = {
    // constants
    LOG_NONE: 0,
    LOG_ERROR: 1,
    LOG_MSG: 2,
    
    // methods
    start: start,
    stop: stop,
    getGames: getGames
};


/**
 * Loads configuration from file.
 *
 * @param   {string}    configFile  Path to configuration file.
 *
 * @returns {Promise}               Promise resolving when configuration has been loaded,
 *                                  rejecting with error message on fatal failure.
 */
function loadConfig(configFile) {
    return new Promise(function(resolve, reject) {
        let filename = path.join(rootDir, configFile);
        fs.readFile(filename, "utf8", function(err, data) {
            // validate config
            if (!err) {
                let cfg;
                try {
                    cfg = JSON.parse(data);
                } catch (ex) {
                    return reject(log("Invalid config file", SgSetup.LOG_ERROR));
                }
                if (!Array.isArray(cfg.games) || !cfg.games.length) {
                    return reject(log("No games specified in config file", SgSetup.LOG_ERROR));
                }
                
                Object.assign(config, cfg);
                resolve();
            } else {
                reject(log(`Could not read config file: ${filename}`, SgSetup.LOG_ERROR));
            }
        });
    });
}


/**
 * Starts all servers.
 *
 * @returns {Promise}   Promise resolving with an object containing non-fatal error messages
 *                      for individual game servers when all servers have started,
 *                      rejecting with error message on fatal failure.
 */
function startServers() {
    return new Promise(function(resolve, reject) {
        // create and start main server
        app = SgApp({ cors: config.cors });
        app.locals.name = config.name;
        server = http.createServer(app);
        server.listen(config.port, function(err) {
            if (err) {
                return reject(log(`Error starting main server: ${err}`, SgSetup.LOG_ERROR));
            }
            log(`Main server running on port ${config.port}`, SgSetup.LOG_MSG);
            
            // create game servers
            let counter = 0;
            let errors = {};
            for (let num = 1; num <= config.games.length; ++num) {
                startGameServer(config.games[num - 1], num).then(check).catch(function(res) {
                    errors[res.id] = res.message;
                    check();
                });
            }

            function check() {
                if (++counter >= config.games.length) {
                    resolve(errors);
                }
            }
        });
    });
}


/**
 * Starts a game server.
 *
 * @param   {object}    cfg     Configuration object for game server (see module defaults).
 * @param   {number}    id      Game index (1-based).
 *
 * @returns {Promise}           Promise resolving when game server has started,
 *                              rejecting with error message on failure.
 */
function startGameServer(cfg, id) {
    return new Promise(function(resolve, reject) {
        // check wordlist
        cfg.wordlist = path.join(rootDir, cfg.wordlist);
        if (!fs.existsSync(cfg.wordlist)) {
            return reject({
                id: id,
                message: log(
                    `Could not find wordlist for game server #${id}: ${cfg.wordlist}`,
                    SgSetup.LOG_ERROR
                )
            });
        }
        
        // setup
        let server = http.createServer();
        let game = SgGame({
            httpServer: server,
            pingTimeout: config.pingTimeout
        }, cfg);
        let gameServer = {
            name: cfg.name,
            server: server,
            port: cfg.port,
            game: game,
            id: id
        };
        app.locals.games.push(gameServer);
        
        // start server
        server.listen(cfg.port, function(err) {
            if (err) {
                return reject({
                    id: id,
                    message: log(
                        `Error starting game server #${gameServer.id}: ${err}`,
                        SgSetup.LOG_ERROR
                    )
                });
            }
            
            log(
                `Game server #${gameServer.id} running on port ${cfg.port} ` +
                `(min: ${cfg.minPlayers}, max: ${cfg.maxPlayers}, timeout: ${cfg.timeout})`,
                SgSetup.LOG_MSG
            );
            resolve();
        });
    });
}


/**
 * Logs a message depending on current log level setting.
 *
 * @param   {string}    msg     Log message.
 * @param   {number}    level   Log level for message.
 *
 * @returns {string}            The log message.
 */
function log(msg, level) {
    if (level <= logLevel) {
        if (level === SgSetup.LOG_ERROR) {
            console.error(msg);
        } else {
            console.log(msg);
        }
    }
    
    return msg;
}


/**
 * Starts the server application.
 *
 * @param   {object}    [cfg]               Configuration object:
 * @param   {string}    [cfg.rootDir]         Root directory for relative paths.
 * @param   {number}    [cfg.logLevel]        Logging level (see module export for constants).
 * @param   {string}    [cfg.configFile]      Path to configuration file.
 *
 * @returns {Promise}                       Promise resolving when all servers have started,
 *                                          rejecting on failure (with truthy argument if fatal).
 */
function start(cfg) {
    cfg = cfg || {};
    
    // set properties
    rootDir = (typeof cfg.rootDir != "undefined" ? cfg.rootDir : ".");
    logLevel = (typeof cfg.logLevel != "undefined" ? cfg.logLevel : SgSetup.LOG_MSG);
    
    // start servers
    if (typeof cfg.configFile == "string") {
        // load config from file
        return loadConfig(cfg.configFile).then(startServers);
    } else {
        // use default config
        log("No config file specified; using defaults", SgSetup.LOG_MSG);
        return startServers();
    }
}


/**
 * Stops all server instances.
 *
 * @returns {Promise}   Promise resolving when all servers have stopped.
 */
function stop() {
    return new Promise(function(resolve) {
        if (!app || !server) {
            return resolve();
        }
        if (!app.locals.games.length) {
            server.close(resolve);
        }
        
        let counter = 0;
        for (let game of app.locals.games) {
            game.game.stop();
            game.server.close(function() {
                if (++counter >= app.locals.games.length) {
                    server.close(resolve);
                }
            });
        }
    });
}


/**
 * Returns running games.
 *
 * @returns {?Array}    Array of game server objects, or null if application not started.
 */
function getGames() {
    return (app ? app.locals.games : null);
}


module.exports = SgSetup;
