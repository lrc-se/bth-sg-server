/**
 * Hiscore service.
 *
 * @module  src/services/hiscores
 */

"use strict";

const repository = require("./db-repository");


module.exports = {
    /**
     * Retrieves top scores from database.
     *
     * @param   {number}    limit   How many scores to fetch.
     *
     * @returns {Promise}           Promise resolving with array of score objects.
     */
    getTop(limit) {
        return repository("scores").then(function(scoreRepo) {
            let cursor = scoreRepo.retrieve().project({ _id: false }).sort("score", -1);
            return cursor.limit(limit).toArray().then(function(scores) {
                scoreRepo.connection.close();
                return scores;
            }).catch(function(err) {
                scoreRepo.connection.close();
                throw err;
            });
        });
    },
    
    
    /**
     * Updates scores in database.
     *
     * @param   {string}    playerNick  Guesser nickname.
     * @param   {string}    drawerNick  Drawer nickname.
     * @param   {number}    points      Main point count.
     *
     * @returns {Promise}               Promise resolving when the update is done.
     */
    update(playerNick, drawerNick, points) {
        let timestamp = +new Date();
        return repository("scores").then(function(scoreRepo) {
            // update hiscore for guesser nick
            scoreRepo.collection.updateOne({ nick: playerNick }, {
                $inc: { score: Math.floor(points) },
                $set: { timestamp: timestamp }
            }, { upsert: true }).then(function() {
                // update hiscore for drawer nick
                return scoreRepo.collection.updateOne({ nick: drawerNick }, {
                    $inc: { score: Math.floor(points / 2) },
                    $set: { timestamp: timestamp }
                }, { upsert: true });
            }).then(function() {
                scoreRepo.connection.close();
            }).catch(function(err) {
                scoreRepo.connection.close();
                throw err;
            });
        });
    }
};
