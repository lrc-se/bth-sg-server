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

// root directory
let rootDir;

// log level
let logLevel;


/**
 * Parses and applies configuration (callback to fs.readFile).
 *
 * @param   {Error}     err     Error object.
 * @param   {string}    data    Config file data.
 */
function parseConfig(err, data) {
    // validate config
    if (!err) {
        let cfg = {};
        try {
            cfg = JSON.parse(data);
        } catch (ex) {
            log("Invalid config file", SgSetup.LOG_ERROR);
            process.exit(1);
        }
        if (!Array.isArray(cfg.games) || !cfg.games.length) {
            log("No games specified in config file", SgSetup.LOG_ERROR);
            process.exit(1);
        }
        Object.assign(config, cfg);
    } else {
        log("Config file not found", SgSetup.LOG_ERROR);
        process.exit(1);
    }
    
    // let's go
    startServers();
}


/**
 * Starts all servers.
 */
function startServers() {
    // create and start main server
    app = SgApp({ cors: config.cors });
    const server = http.createServer(app);
    server.listen(config.port, function(err) {
        if (err) {
            log(`Error starting main server: ${err}`, SgSetup.LOG_ERROR);
            return;
        }
        log(`Main server running on port ${config.port}`, SgSetup.LOG_MSG);
        
        // create game servers
        config.games.forEach(startGameServer);
    });
}


/**
 * Starts a game server.
 *
 * @param   {object}    cfg     Configuration object for game server (see module defaults).
 * @param   {number}    idx     Game index (0-based).
 */
function startGameServer(cfg, idx) {
    let num = idx + 1;
    
    // check wordlist
    cfg.wordlist = path.join(rootDir, cfg.wordlist);
    if (!fs.existsSync(cfg.wordlist)) {
        log(`Could not find wordlist for game server #${num}: ${cfg.wordlist}`, SgSetup.LOG_ERROR);
        return;
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
    app.sgGames.push(gameServer);
    
    // start server
    server.listen(cfg.port, function(err) {
        if (err) {
            log(`Error starting game server #${gameServer.num}: ${err}`, SgSetup.LOG_ERROR);
            return;
        }
        log(
            `Game server #${gameServer.num} running on port ${cfg.port} ` +
            `(min: ${cfg.minPlayers}, max: ${cfg.maxPlayers}, timeout: ${cfg.timeout})`,
            SgSetup.LOG_MSG
        );
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
 */
function start(cfg) {
    cfg = cfg || {};
    
    // set properties
    rootDir = (typeof cfg.rootDir != "undefined" ? cfg.rootDir : ".");
    logLevel = (typeof cfg.logLevel != "undefined" ? cfg.logLevel : SgSetup.LOG_MSG);
    
    // load config, if specified
    if (typeof cfg.configFile != "undefined") {
        fs.readFile(path.join(rootDir, cfg.configFile), "utf8", parseConfig);
    } else {
        log("No config file specified; using defaults", SgSetup.LOG_MSG);
        startServers();
    }
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
    start: start
};


module.exports = SgSetup;
