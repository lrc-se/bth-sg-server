/**
 * Skissa & Gissa server.
 *
 * @module  src/sg-server
 */

"use strict";


const wsServer = require("ws-server");


/**
 * S&G server object prototype.
 */
const SgServerProto = {
    minPlayers: 0,
    maxPlayers: 0,
    timeout: 0,
    server: null
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
        
    });
    return server;
}


module.exports = createServer;
