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
    startServers("config.foo").catch(function(msg) {
        t.equal(msg.substring(0, 26), "Could not read config file", "fatal: missing config file");
        return startServers("config-invalid1.json");
    }).catch(function(msg) {
        t.equal(msg, "Invalid config file", "fatal: invalid config file format");
        return startServers("config-invalid2.json");
    }).catch(function(msg) {
        t.equal(msg, "No games specified in config file", "fatal: missing game definitions");
        return startServers("config-invalid3.json");
    }).then(function(errors) {
        t.same(
            [Object.keys(errors), errors[2].substring(0, 42)],
            [["2"], "Could not find wordlist for game server #2"],
            "non-fatal: missing wordlist for single game server"
        );
        t.end();
    }).catch(function(msg) {
        t.fail(msg);
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
