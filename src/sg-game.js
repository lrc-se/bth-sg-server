/**
 * Skissa & Gissa game runner.
 *
 * @module  src/sg-game
 */

"use strict";


const SgServer = require("./sg-server");
const Wordlist = require("./services/wordlist");
const hiscores = require("./services/hiscores");


/**
 * S&G game object prototype.
 */
const SgGameProto = {
    /**
     * Initializes a game.
     *
     * @param   {string}    wordlist    Path to wordlist file.
     */
    init(wordlist) {
        // init properties
        this.isPaused = true;
        this.players = new Set();
        this.drawers = new Set();
        this.curDrawer = null;
        this.curWord = "";
        this.shapes = [];
        this.countdown = 0;
        this.timer = null;
        
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
        this.wordlist = Wordlist();
        this.wordlist.load(wordlist);
    },
    
    
    /**
     * Handles login request.
     *
     * @param   {string}    nick    Player nickname.
     * @param   {object}    player  Client object.
     */
    handleLogin(nick, player) {
        if (this.players.size >= this.maxPlayers) {
            // too many players
            this.server.sendCommand(player, "FULLHOUSE");
            player.socket.close();
        } else if (this.findPlayer(nick)) {
            // nickname in use
            this.server.sendCommand(player, "DOPPELGANGER");
            player.socket.close();
        } else {
            // login successful
            player.nick = nick;
            this.server.sendCommand(player, "CMONIN");
            this.addPlayer(player);
        }
    },
    
    
    /**
     * Adds a player to the game.
     *
     * @param   {object}    player  Client object.
     */
    addPlayer(player) {
        // init properties
        player.status = "online";
        player.points = 0;
        player.isDrawing = false;
        
        // add player
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
    
    
    /**
     * Removes a player from the game.
     *
     * @param   {object}    player  Client object.
     */
    removePlayer(player) {
        // safety check
        if (!this.players.has(player)) {
            return;
        }
        
        // remove player
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
    
    
    /**
     * Finds a player by name in pool of connected clients.
     *
     * @param   {string}    nick    Player nickname.
     *
     * @returns {?object}           Matching client object, or null if no match found.
     */
    findPlayer(nick) {
        for (let player of this.players) {
            if (player.nick === nick) {
                return player;
            }
        }
        return null;
    },
    
    
    /**
     * Returns stats for all connected players.
     *
     * @returns {Array}     Array of objects with nick and points properties.
     */
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
    
    
    /**
     * Adds a shape to the drawing buffer.
     *
     * @param   {object}    shape   Shape object.
     */
    addShape(shape) {
        this.shapes.push(shape);
    },
    
    
    /**
     * Removes shapes from the drawing buffer (LIFO sequence).
     *
     * @param   {number}    [num]   Number of shapes to remove (zero or omitted value = remove all)
     */
    removeShapes(num) {
        if (num > 0) {
            this.shapes.splice(-num, num);
        } else {
            this.shapes = [];
        }
    },
    
    
    /**
     * Check whether a chat message is a correct answer to the current word being guessed on.
     *
     * @param   {string}    msg     Message to check.
     * @param   {object}    player  Client object (message sender).
     */
    checkWord(msg, player) {
        // safety check
        if (this.isPaused || player === this.curDrawer) {
            return;
        }
        
        // match current word
        if (msg.trim().toUpperCase() === this.curWord.toUpperCase()) {
            // pause game
            clearInterval(this.timer);
            this.isPaused = true;
            
            // register points
            let points = 10 * this.countdown / this.timeout + 1;
            player.points += Math.floor(points);
            this.curDrawer.points += Math.floor(points / 2);
            
            // save hiscores and invoke callback (if enabled) upon completion
            if (this.saveScores) {
                let callback = (typeof this.saveScores == "function" ? this.saveScores : null);
                hiscores.update(player.nick, this.curDrawer.nick, points).then(function() {
                    callback && callback(true);
                }).catch(function() {
                    callback && callback(false);
                });
            }
            
            // announce success and proceed to next word
            this.server.broadcastCommand("GOTIT", {
                nick: player.nick,
                word: this.curWord
            });
            this.server.broadcastCommand("POSSE", this.getPlayerStats());
            this.nextWordDelayed();
        }
    },
    
    
    /**
     * Moves on to the next word.
     */
    nextWord() {
        // clear drawing buffer
        this.removeShapes();
        
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
    
    
    /**
     * Moves on to the next word after the registered delay.
     */
    nextWordDelayed() {
        this.curDrawer.isDrawing = false;
        setTimeout(this.nextWord, this.delay * 1000);
    },
    
    
    /**
     * Countdown callback, invoked every second until timeout.
     */
    tick() {
        this.countdown -= 1;
        if (this.countdown < 1) {
            clearInterval(this.timer);
            this.isPaused = true;
            this.server.broadcastCommand("ITSABUST", this.curWord);
            this.nextWordDelayed();
        }
    },
    
    
    /**
     * Stops the game.
     */
    stop() {
        clearInterval(this.timer);
        this.isPaused = true;
        for (let player of this.players) {
            player.socket.close();
        }
    }
};


/**
 * Creates a new S&G game.
 *
 * @param   {object}                serverConfig                Configuration for game server:
 * @param   {http.Server}           serverConfig.httpServer       HTTP server.
 * @param   {number}                serverConfig.pingTimeout      Ping timeout in milliseconds.
 * @param   {object}                gameConfig                  Configuration for game runner:
 * @param   {number}                gameConfig.minPlayers         Minimum number of players.
 * @param   {number}                gameConfig.maxPlayers         Maximum number of players.
 * @param   {number}                gameConfig.timeout            Round timeout in seconds.
 * @param   {number}                gameConfig.delay              Delay between words in seconds.
 * @param   {string}                gameConfig.wordlist           Path to wordlist file.
 * @param   {(boolean|function)}    gameConfig.saveScores         Truthy to save scores in database,
 *                                                                invoking callback if callable.
 *
 * @returns {object}                                            S&G game runner object instance.
 */
function createGame(serverConfig, gameConfig) {
    // create game
    let game = Object.create(SgGameProto);
    game.minPlayers = gameConfig.minPlayers;
    game.maxPlayers = gameConfig.maxPlayers;
    game.timeout = gameConfig.timeout;
    game.delay = gameConfig.delay;
    game.saveScores = gameConfig.saveScores;
    
    // create server
    let server = SgServer(serverConfig);
    game.server = server;
    
    // initialize game
    game.init(gameConfig.wordlist);
    
    return game;
}


module.exports = createGame;
