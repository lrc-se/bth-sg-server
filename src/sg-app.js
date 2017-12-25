/**
 * S&G Express application.
 *
 * @module  src/app
 */

"use strict";

const express = require("express");
const repository = require("./services/db-repository");


/**
 * Creates and returns an application instance.
 *
 * @param   {object}            cfg         Configuration object:
 * @param   {(Array|boolean)}   cfg.cors      Array of origins to allow CORS requests from,
 *                                            or a boolean value denoting whether to enable CORS
 *                                            for all requests.
 * @returns {object}                        Express application object instance.
 */
function createApp(cfg) {
    // init
    let app = express();
    app.games = [];
    
    // handle CORS for API routes
    if (cfg.cors) {
        app.use("/api", function(req, res, next) {
            let allow = false;
            if (cfg.cors === true) {
                allow = "*";
            } else if (Array.isArray(cfg.cors) && ~cfg.cors.indexOf(req.get("origin"))) {
                allow = req.get("origin");
            }
            if (allow) {
                res.header("Access-Control-Allow-Origin", allow);
            }
            next();
        });
    }
    
    // set up database connection
    app.use("/api/scores", function(req, res, next) {
        repository("scores").then(function(scoreRepo) {
            req.scores = scoreRepo;
            next();
        }).catch(next);
    });
    
    // set up routes
    require("./routes/routes").setup(app);
    
    // tear down database connection
    app.use("/api/scores", function(req) {
        req.scores.connection.close();
    });
    
    // set up 404
    app.use(function(req, res, next) {
        let err = new Error("404 Not Found");
        err.status = 404;
        next(err);
    });
    
    return app;
}


module.exports = createApp;
