#!/usr/bin/env node

/**
 * Hiscore database reset.
 */

"use strict";

const repository = require("./src/services/db-repository");


console.log("Resetting hiscore database...");
repository("scores").then(function(scoreRepo) {
    scoreRepo.collection.deleteMany().then(function() {
        console.log("All entries deleted");
        scoreRepo.connection.close().then(function() {
            process.exit(0);
        });
    }).catch(function(err) {
        console.error("Error deleting entries:", err.message);
        scoreRepo.connection.close().then(function() {
            process.exit(1);
        });
    });
}).catch(function(err) {
    console.error("Connection error:", err.message);
    process.exit(1);
});
