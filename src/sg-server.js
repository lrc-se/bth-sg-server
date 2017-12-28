/**
 * Skissa & Gissa server.
 *
 * @module  src/sg-server
 */

"use strict";


const wsServer = require("ws-server");


/**
 * Handles player connection.
 *
 * @param   {object}    player  Client instance.
 */
function handleConnection(player) {
    player.status = "handshake";
}


/**
 * Handles player disconnection.
 *
 * @param   {number}    code    Closing code (not used).
 * @param   {String}    reason  Closing reason (not used).
 * @param   {object}    player  Client instance.
 */
function handleDisconnection(code, reason, player) {
    this.emit("part", player);
}


/**
 * Handles incoming player messages.
 *
 * @param   {String}    msg     Incoming message.
 * @param   {object}    player  Client instance.
 */
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
        default:
            // NOOP
    }
}


/**
 * S&G server object prototype.
 */
const SgServerProto = {
    /**
     * Underlying ws-server instance.
     */
    server: null,
    
    
    /**
     * Handles handshake messages.
     *
     * @param   {object}    data    Message data.
     * @param   {object}    player  Client instance.
     */
    handleHandshake(data, player) {
        if (data.cmd == "HOWDY") {
            player.status = "login";
            this.sendCommand(player, "GDAYMATE");
        } else {
            player.socket.close(1002, "Invalid handshake");
        }
    },
    
    
    /**
     * Handles player login attempt.
     *
     * @param   {object}    data    Message data.
     * @param   {object}    player  Client instance.
     */
    handleLogin(data, player) {
        if (data.cmd == "LEMMEIN") {
            this.emit("login", data.data, player);
        } else {
            player.socket.close(1002, "Invalid handshake");
        }
    },
    
    
    /**
     * Handles player protocol commands.
     *
     * @param   {object}    data    Message data.
     * @param   {object}    player  Client instance.
     */
    handleCommand(data, player) {
        // general commands
        switch (data.cmd) {
            case "QUOTH":
                this.broadcastCommand("QUOTH", data.data, player);
                this.emit("msg", data.data.text, player);
                break;
            case "SEEYA":
                player.socket.close();
                this.emit("part", player);
                break;
            default: {
                // check for drawer-only commands
                if (player.isDrawing) {
                    this.handleDrawerCommand(data, player);
                }
            }
        }
    },
    
    
    /**
     * Handles protocol commands from drawing player.
     *
     * @param   {object}    data    Message data.
     * @param   {object}    player  Client instance.
     */
    handleDrawerCommand(data, player) {
        switch (data.cmd) {
            case "DOODLE":
                this.emit("draw", data.data);
                break;
            case "OOPS":
                this.emit("undo", 1);
                break;
            case "SCRAP":
                this.emit("undo");
                break;
            default:
                // unknown command
                return;
        }
        
        // command recognized, so relay it
        this.server.broadcastJSON(data, player.socket);
    },
    
    
    /**
     * Sends a protocol command to a specific player.
     *
     * @param   {object}    player  Client instance.
     * @param   {String}    cmd     Command to send.
     * @param   {object}    [data]  Data payload, if any.
     */
    sendCommand(player, cmd, data) {
        this.server.sendJSON(player.socket, { cmd, data });
    },
    
    
    /**
     * Sends a protocol command to all connected players.
     *
     * @param   {String}    cmd         Command to send.
     * @param   {object}    [data]      Data payload, if any.
     * @param   {object}    [exclude]   Client instance to exclude from broadcast, if any.
     */
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
        connectionHandler: handleConnection,
        closeHandler: handleDisconnection.bind(server),
        messageHandler: handleMessage.bind(server),
        timeout: config.pingTimeout
    });
    return server;
}


module.exports = createServer;
