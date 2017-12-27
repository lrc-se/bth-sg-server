/**
 * Tests for Skissa & Gissa server (application startup).
 */

"use strict";

const tap = require("tap");
const SgSetup = require("../src/sg-setup");


function startServers(configFile) {
    return SgSetup.start({
        rootDir: __dirname,
        configFile: `./setup/${configFile}`,
        logLevel: SgSetup.LOG_NONE
    });
}


tap.afterEach(function() {
    return SgSetup.stop();
});


tap.tearDown(process.exit);


tap.test("Test config file errors", function(t) {
    startServers("config.foo").catch(function(res) {
        t.true(res, "fatal: missing config file");
        return startServers("config-invalid1.json");
    }).catch(function(res) {
        t.true(res, "fatal: invalid config file format");
        return startServers("config-invalid2.json");
    }).catch(function(res) {
        t.true(res, "fatal: missing game definitions");
        return startServers("config-invalid3.json");
    }).catch(function(res) {
        t.false(res, "non-fatal: missing wordlist for single game server");
        t.end();
    });
});


tap.test("Test successful start", function(t) {
    startServers("config.json").then(function() {
        let games = SgSetup.getGames();
        t.equal(games.length, 2, "two games loaded");
        t.equal(games[0].name, "Test1", "first game correctly loaded");
        t.equal(games[1].name, "test 2", "second game correctly loaded");
        t.end();
    }).catch(function() {
        t.fail();
        t.end();
    });
});
