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
    this.emit("part", player);
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
            this.emit("login", data.data, player);
        } else {
            player.socket.close(1002, "Invalid handshake");
        }
    },
    
    handleCommand(data, player) {
        switch (data.cmd) {
            case "DOODLE":
                if (player.isDrawing) {
                    this.server.broadcastJSON(data, player.socket);
                }
                this.emit("draw", data.data);
                break;
            case "OOPS":
                if (player.isDrawing) {
                    this.server.broadcastJSON(data, player.socket);
                }
                this.emit("undo", 1);
                break;
            case "QUOTH":
                this.broadcastCommand("QUOTH", data.data, player);
                this.emit("msg", data.data.text, player);
                break;
            case "SCRAP":
                if (player.isDrawing) {
                    this.server.broadcastJSON(data, player.socket);
                }
                this.emit("undo");
                break;
            case "SEEYA":
                player.socket.close();
                this.emit("part", player);
                break;
        }
    },
    
    sendCommand(player, cmd, data) {
        this.server.sendJSON(player.socket, { cmd, data });
    },
    
    broadcastCommand(cmd, data, exclude) {
        if (exclude) {
            this.server.broadcastJSON({ cmd, data }, exclude.socket);
        } else {
            this.server.broadcastJSON({ cmd, data });
        }
    }
};

// hook into Node's event system
Object.setPrototypeOf(SgServerProto, require("events").EventEmitter.prototype);


/**
 * Creates a new S&G server instance.
 *
 * @param   {object}        config              Configuration object:
 * @param   {http.Server}   config.httpServer     HTTP server instance.
 * @param   {number}        config.pingTimeout    Ping timeout in milliseconds.
 *
 * @returns {object}                            S&G server object instance.
 */
function createServer(config) {
    let server = Object.create(SgServerProto);
    server.server = wsServer({ server: config.httpServer }, {
        connectionHandler: handleConnection.bind(server),
        closeHandler: handleDisconnection.bind(server),
        messageHandler: handleMessage.bind(server),
        timeout: config.pingTimeout
    });
    return server;
}


module.exports = createServer;
