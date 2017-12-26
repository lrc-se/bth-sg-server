#!/usr/bin/env node

/**
 * S&G server startup.
 */

"use strict";

const SgSetup = require("./src/sg-setup");


SgSetup.start({
    rootDir: __dirname,
    configFile: "./config.json",
    logLevel: SgSetup.LOG_MSG
});
