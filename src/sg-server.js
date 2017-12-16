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
    this.game.removePlayer(player);
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
    game: null,
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
            if (this.game.players.size >= this.maxPlayers) {
                this.sendCommand(player, "FULLHOUSE");
                player.socket.close();
            } else if (this.game.findPlayer(data.data)) {
                this.sendCommand(player, "DOPPELGANGER");
                player.socket.close();
            } else {
                player.nick = data.data;
                this.sendCommand(player, "CMONIN");
                this.game.addPlayer(player);
            }
        } else {
            player.socket.close(1002, "Invalid handshake");
        }
    },
    
    handleCommand(data, player) {
        switch (data.cmd) {
            case "DOODLE":
                this.server.broadcastJSON(data, player.socket);
                this.game.addShape(data.data);
                break;
            case "OOPS":
                this.server.broadcastJSON(data, player.socket);
                this.game.removeShapes(1);
                break;
            case "QUOTH":
                this.broadcastCommand("QUOTH", {
                    nick: player.nick,
                    text: data.data
                }, player.socket);
                break;
            case "SCRAP":
                this.server.broadcastJSON(data, player.socket);
                this.game.removeShapes();
                break;
            case "SEEYA":
                player.socket.close();
                this.game.removePlayer(player);
                break;
        }
    },
    
    sendCommand(player, cmd, data) {
        this.server.sendJSON(player.socket, { cmd, data });
    },
    
    broadcastCommand(cmd, data, exclude) {
        this.server.broadcastJSON({ cmd, data }, exclude);
    }
};


/**
 * Creates a new S&G server instance.
 *
 * @param   {object}        game                S&G game instance.
 * @param   {object}        config              Configuration object:
 * @param   {http.Server}   config.httpServer     HTTP server instance.
 * @param   {number}        config.pingTimeout    Ping timeout in milliseconds.
 *
 * @returns {object}                            S&G server object instance.
 */
function createServer(game, config) {
    let server = Object.create(SgServerProto);
    server.game = game;
    server.server = wsServer({ server: config.httpServer }, {
        connectionHandler: handleConnection.bind(server),
        closeHandler: handleDisconnection.bind(server),
        messageHandler: handleMessage.bind(server),
        timeout: config.pingTimeout
    });
    return server;
}


module.exports = createServer;
