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
 * Loads configuration from file.
 *
 * @param   {string}    configFile  Path to configuration file.
 *
 * @returns {Promise}               Promise resolving when configuration has been loaded,
 *                                  rejecting with truthy argument on fatal failure.
 */
function loadConfig(configFile) {
    return new Promise(function(resolve, reject) {
        fs.readFile(path.join(rootDir, configFile), "utf8", function(err, data) {
            // validate config
            if (!err) {
                let cfg = {};
                try {
                    cfg = JSON.parse(data);
                } catch (ex) {
                    log("Invalid config file", SgSetup.LOG_ERROR);
                    return reject(true);
                }
                if (!Array.isArray(cfg.games) || !cfg.games.length) {
                    log("No games specified in config file", SgSetup.LOG_ERROR);
                    return reject(true);
                }
                
                Object.assign(config, cfg);
                resolve();
            } else {
                log("Config file not found", SgSetup.LOG_ERROR);
                reject(true);
            }
        });
    });
}


/**
 * Starts all servers.
 *
 * @returns {Promise}   Promise resolving when all servers have started, rejecting on failure
 *                      (with truthy argument if fatal).
 */
function startServers() {
    return new Promise(function(resolve, reject) {
        // create and start main server
        app = SgApp({ cors: config.cors });
        server = http.createServer(app);
        server.listen(config.port, function(err) {
            if (err) {
                log(`Error starting main server: ${err}`, SgSetup.LOG_ERROR);
                return reject(true);
            }
            log(`Main server running on port ${config.port}`, SgSetup.LOG_MSG);
            
            // create game servers
            let counter = 0;
            let failed = false;
            for (let num = 1; num <= config.games.length; ++num) {
                startGameServer(config.games[num - 1], num).then(check).catch(function() {
                    failed = true;
                    check();
                });
            }

            function check() {
                if (++counter >= config.games.length) {
                    if (!failed) {
                        resolve();
                    } else {
                        reject();
                    }
                }
            }
        });
    });
}


/**
 * Starts a game server.
 *
 * @param   {object}    cfg     Configuration object for game server (see module defaults).
 * @param   {number}    num     Game index (1-based).
 *
 * @returns {Promise}           Promise resolving when game server has started,
 *                              rejecting on failure.
 */
function startGameServer(cfg, num) {
    return new Promise(function(resolve, reject) {
        // check wordlist
        cfg.wordlist = path.join(rootDir, cfg.wordlist);
        if (!fs.existsSync(cfg.wordlist)) {
            log(
                `Could not find wordlist for game server #${num}: ${cfg.wordlist}`,
                SgSetup.LOG_ERROR
            );
            return reject();
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
            num: num
        };
        app.locals.games.push(gameServer);
        
        // start server
        server.listen(cfg.port, function(err) {
            if (err) {
                log(`Error starting game server #${gameServer.num}: ${err}`, SgSetup.LOG_ERROR);
                return reject();
            }
            
            log(
                `Game server #${gameServer.num} running on port ${cfg.port} ` +
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
 */
function log(msg, level) {
    if (level > logLevel) {
        return;
    }
    
    if (level === SgSetup.LOG_ERROR) {
        console.error(msg);
    } else {
        console.log(msg);
    }
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
    if (typeof cfg.configFile != "undefined") {
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


module.exports = SgSetup;
