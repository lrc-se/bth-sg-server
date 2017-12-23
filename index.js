#!/usr/bin/env node

/**
 * S&G server startup.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");
const SgGame = require("./src/sg-game");


// default config
let config = {
    port: 1700,
    pingTimeout: 30000,
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


// load config
fs.readFile(path.join(__dirname, "./config.json"), "utf8", function(err, data) {
    // validate config
    if (!err) {
        let cfg = {};
        try {
            cfg = JSON.parse(data);
        } catch (ex) {
            console.error("Invalid config file");
            process.exit(1);
        }
        if (!Array.isArray(cfg.games) || !cfg.games.length) {
            console.error("No games specified in config file");
            process.exit(1);
        }
        Object.assign(config, cfg);
    } else {
        console.log("No config file found; using defaults");
    }
    
    // create and start main server
    const app = require("./src/sg-app");
    const server = http.createServer(app);
    server.listen(config.port, function(err) {
        if (err) {
            console.error(`Error starting main server:`, err);
            return;
        }
        console.log(`Main server running on port ${config.port}`);
        
        // create game servers
        for (let num = 1; num <= config.games.length; ++num) {
            let cfg = config.games[num - 1];
            
            // check wordlist
            cfg.wordlist = path.join(__dirname, cfg.wordlist);
            if (!fs.existsSync(cfg.wordlist)) {
                console.error(`Could not find wordlist for game server #${num}:`, cfg.wordlist);
                continue;
            }
            
            // setup
            let server2 = http.createServer();
            let game = SgGame({
                httpServer: server2,
                pingTimeout: config.pingTimeout
            }, cfg);
            let gameServer = {
                name: cfg.name,
                server: server2,
                port: cfg.port,
                game: game,
                num: num
            };
            app.games.push(gameServer);
            
            // start server
            server2.listen(cfg.port, function(err) {
                if (err) {
                    console.error(`Error starting game server #${gameServer.num}:`, err);
                    return;
                }
                console.log(
                    `Game server #${gameServer.num} running on port ${cfg.port} ` +
                    `(min: ${cfg.minPlayers}, max: ${cfg.maxPlayers}, timeout: ${cfg.timeout})`
                );
            });
        }
    });
});
