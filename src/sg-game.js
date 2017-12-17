/**
 * Skissa & Gissa game runner.
 *
 * @module  src/sg-game
 */

"use strict";


const SgServer = require("./sg-server");


/**
 * S&G game object prototype.
 */
const SgGameProto = {
    minPlayers: 0,
    maxPlayers: 0,
    timeout: 0,
    players: new Set(),
    shapes: [],
    server: null,
    
    init() {
        this.server.on("login", this.handleLogin.bind(this));
        this.server.on("part", this.removePlayer.bind(this));
        this.server.on("draw", this.addShape.bind(this));
        this.server.on("undo", this.removeShapes.bind(this));
        this.server.on("msg", this.checkWord.bind(this));
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
        this.players.add(player);
        this.server.broadcastCommand("PEEKABOO", player.nick, player.socket);
        this.server.broadcastCommand("POSSE", this.getPlayerStats());
    },
    
    removePlayer(player) {
        this.players.delete(player);
        this.server.broadcastCommand("SKEDADDLE", player.nick);
        this.server.broadcastCommand("POSSE", this.getPlayerStats());
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
 *
 * @returns {object}                                    S&G game runner object instance.
 */
function createGame(serverConfig, gameConfig) {
    // create game
    let game = Object.create(SgGameProto);
    game.minPlayers = gameConfig.minPlayers;
    game.maxPlayers = gameConfig.maxPlayers;
    game.timeout = gameConfig.timeout;
    
    // create server
    let server = SgServer(serverConfig);
    game.server = server;
    
    game.init();
    return game;
}


module.exports = createGame;
