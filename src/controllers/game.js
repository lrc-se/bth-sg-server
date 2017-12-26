/**
 * Game controller.
 */

"use strict";


module.exports = {
    /**
     * Game index.
     */
    index(req, res) {
        let games = [];
        for (let game of req.app.sgGames) {
            games.push({
                name: game.name || "",
                port: game.port,
                numPlayers: game.game.players.size,
                minPlayers: game.game.minPlayers,
                maxPlayers: game.game.maxPlayers,
                timeout: game.game.timeout
            });
        }
        res.json({ data: games });
    }
};
