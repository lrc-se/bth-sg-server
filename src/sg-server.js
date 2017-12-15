/**
 * Skissa & Gissa server.
 *
 * @module  src/sg-server
 */

"use strict";


const wsServer = require("ws-server");


function handleConnection(player) {
    player.status = "handshake";
}
    

function handleDisconnection(code, reason, player) {
    this.removePlayer(player);
}


function handleMessage(msg, player) {
    let data;
    try {
        data = JSON.parse(msg);
    } catch (ex) {
        return;
    }
    
    switch (player.status) {
        case "handshake":
            this.handleHandshake(data, player);
            break;
        case "login":
            this.handleLogin(data, player);
            break;
        case "online":
            this.handleCommand(data, player);
            break;
    }
}


/**
 * S&G server object prototype.
 */
const SgServerProto = {
    minPlayers: 0,
    maxPlayers: 0,
    timeout: 0,
    players: new Set(),
    shapes: [],
    server: null,
    
    handleHandshake(data, player) {
        if (data.cmd == "HOWDY") {
            player.status = "login";
            this.sendCommand(player, "GDAYMATE");
        } else {
            player.socket.close(1002, "Invalid handshake");
        }
    },
    
    handleLogin(data, player) {
        if (data.cmd == "LEMMEIN") {
            if (this.players.size >= this.maxPlayers) {
                this.sendCommand(player, "FULLHOUSE");
                player.socket.close();
            } else if (this.findPlayer(data.data)) {
                this.sendCommand(player, "DOPPELGANGER");
                player.socket.close();
            } else {
                player.nick = data.data;
                this.sendCommand(player, "CMONIN");
                this.addPlayer(player);
            }
        } else {
            player.socket.close(1002, "Invalid handshake");
        }
    },
    
    handleCommand(data, player) {
        switch (data.cmd) {
            case "DOODLE":
                this.server.broadcastJSON(data, player.socket);
                this.shapes.push(data.data);
                break;
            case "OOPS":
                this.server.broadcastJSON(data, player.socket);
                this.shapes.splice(-1, 1);
                break;
            case "QUOTH":
                this.broadcastCommand("QUOTH", {
                    nick: player.nick,
                    text: data.data
                }, player.socket);
                break;
            case "SCRAP":
                this.server.broadcastJSON(data, player.socket);
                this.shapes = [];
                break;
            case "SEEYA":
                player.socket.close();
                this.removePlayer(player);
                break;
        }
    },
    
    sendCommand(player, cmd, data) {
        this.server.sendJSON(player.socket, { cmd, data });
    },
    
    broadcastCommand(cmd, data, exclude) {
        this.server.broadcastJSON({ cmd, data }, exclude);
    },
    
    addPlayer(player) {
        player.status = "online";
        player.points = 0;
        this.players.add(player);
        this.broadcastCommand("PEEKABOO", player.nick, player.socket);
        this.broadcastCommand("POSSE", this.getPlayers());
    },
    
    removePlayer(player) {
        this.players.delete(player);
        this.broadcastCommand("SKEDADDLE", player.nick);
        this.broadcastCommand("POSSE", this.getPlayers());
    },
    
    findPlayer(nick) {
        for (let player of this.players) {
            if (player.nick === nick) {
                return player;
            }
        }
        return null;
    },
    
    getPlayers() {
        let players = [];
        for (let player of this.players) {
            players.push({
                nick: player.nick,
                points: player.points
            });
        }
        return players;
    }
};


/**
 * Creates a new S&G server instance.
 *
 * @param   {http.Server}   httpServer          HTTP server.
 * @param   {object}        config              Configuration object:
 * @param   {number}        config.minPlayers     Minimum number of players.
 * @param   {number}        config.maxPlayers     Maximum number of players.
 * @param   {number}        config.timeout        Round timeout in seconds.
 *
 * @returns {object}                            S&G server object instance.
 */
function createServer(httpServer, config) {
    let server = Object.create(SgServerProto);
    server.minPlayers = config.minPlayers;
    server.maxPlayers = config.maxPlayers;
    server.timeout = config.timeout;
    server.server = wsServer({ server: httpServer }, {
        connectionHandler: handleConnection.bind(server),
        closeHandler: handleDisconnection.bind(server),
        messageHandler: handleMessage.bind(server),
        timeout: 30000
    });
    return server;
}


module.exports = createServer;
