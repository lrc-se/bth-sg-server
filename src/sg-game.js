/**
 * Skissa & Gissa game runner.
 *
 * @module  src/sg-game
 */

"use strict";


const SgServer = require("./sg-server");
const Wordlist = require("./services/wordlist");


/**
 * S&G game object prototype.
 */
const SgGameProto = {
    server: null,
    wordlist: null,
    
    minPlayers: 0,
    maxPlayers: 0,
    timeout: 0,
    delay: 0,
    isPaused: true,
    players: new Set(),
    drawers: new Set(),
    curDrawer: null,
    curWord: "",
    shapes: [],
    countdown: 0,
    timer: null,
    
    init(wordlist) {
        // set up event listeners
        this.server.on("login", this.handleLogin.bind(this));
        this.server.on("part", this.removePlayer.bind(this));
        this.server.on("draw", this.addShape.bind(this));
        this.server.on("undo", this.removeShapes.bind(this));
        this.server.on("msg", this.checkWord.bind(this));
        
        // set up calling context for timer functions
        this.nextWord = this.nextWord.bind(this);
        this.tick = this.tick.bind(this);
        
        // load wordlist
        this.wordlist = new Wordlist();
        this.wordlist.load(wordlist);
    },
    
    handleLogin(nick, player) {
        if (this.players.size >= this.maxPlayers) {
            this.server.sendCommand(player, "FULLHOUSE");
            player.socket.close();
        } else if (this.findPlayer(nick)) {
            this.server.sendCommand(player, "DOPPELGANGER");
            player.socket.close();
        } else {
            player.nick = nick;
            this.server.sendCommand(player, "CMONIN");
            this.addPlayer(player);
        }
    },
    
    addPlayer(player) {
        player.status = "online";
        player.points = 0;
        player.isDrawing = false;
        this.players.add(player);
        this.drawers.add(player);
        this.server.broadcastCommand("PEEKABOO", player.nick, player);
        this.server.broadcastCommand("POSSE", this.getPlayerStats());
        
        // send opening messages
        if (this.isPaused) {
            // (re)start game if the fresh addition brings the player count above the minimum
            if (this.players.size >= this.minPlayers) {
                this.nextWord();
            } else {
                this.server.sendCommand(player, "SHUTEYE");
            }
        } else {
            // game in progress, so send drawing data
            this.server.sendCommand(player, "THEYREIT", this.curDrawer.nick);
            this.server.sendCommand(player, "TMINUS", this.countdown);
            for (let shape of this.shapes) {
                this.server.sendCommand(player, "DOODLE", shape);
            }
        }
    },
    
    removePlayer(player) {
        if (!this.players.has(player)) {
            return;
        }
        this.players.delete(player);
        this.drawers.delete(player);
        this.server.broadcastCommand("SKEDADDLE", player.nick);
        this.server.broadcastCommand("POSSE", this.getPlayerStats());
        
        // are there enough players left to continue the game?
        if (this.players.size < this.minPlayers) {
            clearInterval(this.timer);
            this.isPaused = true;
            this.server.broadcastCommand("SHUTEYE");
        }
        
        // was the departed player also the one currently drawing?
        if (player === this.curDrawer) {
            clearInterval(this.timer);
            if (!this.isPaused) {
                this.nextWordDelayed();
            }
        }
    },
    
    findPlayer(nick) {
        for (let player of this.players) {
            if (player.nick === nick) {
                return player;
            }
        }
        return null;
    },
    
    getPlayerStats() {
        let players = [];
        for (let player of this.players) {
            players.push({
                nick: player.nick,
                points: player.points
            });
        }
        return players;
    },
    
    addShape(shape) {
        this.shapes.push(shape);
    },
    
    removeShapes(num) {
        if (num > 0) {
            this.shapes.splice(-num, num);
        } else {
            this.shapes = [];
        }
    },
    
    checkWord(word, player) {
        if (this.isPaused || player === this.curDrawer) {
            return;
        }
        
        if (word.trim().toUpperCase() === this.curWord.toUpperCase()) {
            clearInterval(this.timer);
            this.isPaused = true;
            
            // register points
            let points = 10 * this.countdown / this.timeout + 1;
            player.points += Math.floor(points);
            this.curDrawer.points += Math.floor(points / 2);
            
            // announce success and proceed to next word
            this.server.broadcastCommand("GOTIT", {
                nick: player.nick,
                word: this.curWord
            });
            this.server.broadcastCommand("POSSE", this.getPlayerStats());
            this.nextWordDelayed();
        }
    },
    
    nextWord() {
        // are there any players left?
        if (!this.players.size) {
            return;
        }
        
        // get next word and drawer
        this.curWord = this.wordlist.getNextWord();
        if (!this.drawers.size) {
            this.drawers = new Set(this.players);
        }
        this.curDrawer = Array.from(this.drawers)[0];
        this.curDrawer.isDrawing = true;
        this.drawers.delete(this.curDrawer);
        
        // announce drawer
        this.server.sendCommand(this.curDrawer, "YOUREIT", this.curWord);
        this.server.broadcastCommand("THEYREIT", this.curDrawer.nick, this.curDrawer);
        
        // start countdown
        this.isPaused = false;
        this.countdown = this.timeout;
        this.timer = setInterval(this.tick, 1000);
        this.server.broadcastCommand("TMINUS", this.countdown);
    },
    
    nextWordDelayed() {
        this.curDrawer.isDrawing = false;
        setTimeout(this.nextWord, this.delay * 1000);
    },
    
    tick() {
        this.countdown -= 1;
        if (this.countdown < 1) {
            clearInterval(this.timer);
            this.isPaused = true;
            this.server.broadcastCommand("ITSABUST", this.curWord);
            this.nextWordDelayed();
        }
    }
};


/**
 * Creates a new S&G game.
 *
 * @param   {object}        serverConfig                Configuration object for game server:
 * @param   {http.Server}   serverConfig.httpServer       HTTP server.
 * @param   {number}        serverConfig.pingTimeout      Ping timeout in milliseconds.
 * @param   {object}        gameConfig                  Configuration object for game runner:
 * @param   {number}        gameConfig.minPlayers         Minimum number of players.
 * @param   {number}        gameConfig.maxPlayers         Maximum number of players.
 * @param   {number}        gameConfig.timeout            Round timeout in seconds.
 * @param   {number}        gameConfig.delay              Delay between words in seconds.
 * @param   {String}        gameConfig.wordlist           Path to wordlist file.
 *
 * @returns {object}                                    S&G game runner object instance.
 */
function createGame(serverConfig, gameConfig) {
    // create game
    let game = Object.create(SgGameProto);
    game.minPlayers = gameConfig.minPlayers;
    game.maxPlayers = gameConfig.maxPlayers;
    game.timeout = gameConfig.timeout;
    game.delay = gameConfig.delay;
    
    // create server
    let server = SgServer(serverConfig);
    game.server = server;
    
    // initialize game
    game.init(gameConfig.wordlist);
    
    return game;
}


module.exports = createGame;
