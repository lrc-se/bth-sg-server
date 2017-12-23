/**
 * S&G Express application.
 *
 * @module  src/app
 */

"use strict";

const express = require("express");


// init
let app = express();
app.games = [];

// set up routes
require("./routes/routes").setup(app);

// set up 404
app.use(function(req, res, next) {
    let err = new Error("404 Not Found");
    err.status = 404;
    next(err);
});


module.exports = app;
