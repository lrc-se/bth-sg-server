/**
 * Score controller.
 */

"use strict";


module.exports = {
    /**
     * Hiscore index.
     */
    index(req, res, next) {
        let cursor = req.sgScores.retrieve().project({ _id: false }).sort("score", -1).limit(10);
        cursor.toArray().then(function(scores) {
            res.json({ data: scores });
            next();
        }).catch(function() {
            res.json({ error: "Kunde inte hämta topplistan från databasen." });
            next();
        });
    }
};