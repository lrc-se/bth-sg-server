/**
 * S&G Express application.
 *
 * @module  src/app
 */

"use strict";

const express = require("express");


/**
 * Creates a new S&G app instance.
 *
 * @returns {object}    Express app instance.
 */
function createApp() {
    // init
    let app = express();
    
    // set up 404
    app.use(function(req, res, next) {
        let err = new Error("404 Not Found");
        err.status = 404;
        next(err);
    });
    
    return app;
}


module.exports = createApp;
