/**
 * Score controller.
 */

"use strict";

const hiscores = require("../services/hiscores");


module.exports = {
    /**
     * Hiscore index.
     */
    index(req, res) {
        hiscores.getTop(10).then(function(scores) {
            res.json({ data: scores });
        }).catch(function(err) {
            let msg;
            if (err.name == "MongoNetworkError") {
                msg = "Kunde inte ansluta till databasen.";
            } else {
                msg = "Kunde inte hämta topplistan från databasen.";
            }
            res.json({ error: msg });
        });
    }
};
