/**
 * Tests for Skissa & Gissa server (API routes).
 */

"use strict";

const tap = require("tap");
const http = require("http");
const request = require("supertest");
const SgApp = require("../src/sg-app");
const SgGame = require("../src/sg-game");


let port = process.env.SG_PORT || 1701;
let server;
let app;


/*tap.beforeEach(function(done) {
    app = SgApp({
    server = http.createServer(app);
    return Promise.resolve();
});*/

function startServer(serverConfig, gameConfig) {
    serverConfig = serverConfig || {};
    gameConfig = gameConfig || {};
    return new Promise(function(resolve) {
        app = SgApp({
            cors: serverConfig.cors || false
        });
        app.locals.name = "Test server";
        
        server = http.createServer(app);
        app.locals.games.push({
            name: "Test game",
            server: server,
            port: gameConfig.port || port + 1,
            num: 1,
            game: SgGame({ httpServer: server }, {
                port: gameConfig.port || port + 1,
                minPlayers: gameConfig.minPlayers || 2,
                maxPlayers: gameConfig.maxPlayers || 10,
                timeout: gameConfig.timeout || 60,
                delay: gameConfig.delay || 3,
                wordlist: gameConfig.wordlist || "./words.json",
                saveScores: gameConfig.saveScores || false
            })
        });
        server.listen(port, resolve);
    });
}


tap.afterEach(function(done) {
    server.close(done);
});


tap.tearDown(process.exit);


tap.test("Test info route (no CORS)", function(t) {
    startServer().then(function() {
        request(app).get("/api/info")
            .expect("Content-Type", /json/)
            .expect(200)
            .then(function(res) {
                t.same(res.body, { data: {
                    name: "Test server",
                    type: "S&G",
                    version: 1
                } }, "correct response received");
                t.false(res.headers["access-control-allow-origin"], "no CORS header present");
                t.end();
            }).catch(function(err) {
                t.fail(err.message);
                t.end();
            });
    });
});


tap.test("Test info route (catch-all CORS)", function(t) {
    startServer({ cors: true }).then(function() {
        request(app).get("/api/info")
            .expect("Content-Type", /json/)
            .expect(200)
            .then(function(res) {
                t.same(res.body, { data: {
                    name: "Test server",
                    type: "S&G",
                    version: 1
                } }, "correct response received");
                t.equal(res.headers["access-control-allow-origin"], "*", "CORS header present");
                t.end();
            }).catch(function(err) {
                t.fail(err.message);
                t.end();
            });
    });
});


tap.test("Test info route (non-matching CORS origin)", function(t) {
    startServer({ cors: ["http://www.google.com"] }).then(function() {
        request(app).get("/api/info")
            .set("Origin", "http://localhost:" + port)
            .expect("Content-Type", /json/)
            .expect(200)
            .then(function(res) {
                t.same(res.body, { data: {
                    name: "Test server",
                    type: "S&G",
                    version: 1
                } }, "correct response received");
                t.false(res.headers["access-control-allow-origin"], "no CORS header present");
                t.end();
            }).catch(function(err) {
                t.fail(err.message);
                t.end();
            });
    });
});


tap.test("Test info route (matching CORS origin)", function(t) {
    let origin = "http://localhost:" + port;
    startServer({ cors: [origin] }).then(function() {
        request(app).get("/api/info")
            .set("Origin", origin)
            .expect("Content-Type", /json/)
            .expect(200)
            .then(function(res) {
                t.same(res.body, { data: {
                    name: "Test server",
                    type: "S&G",
                    version: 1
                } }, "correct response received");
                t.equal(
                    res.headers["access-control-allow-origin"],
                    origin,
                    "CORS header present"
                );
                t.end();
            }).catch(function(err) {
                t.fail(err.message);
                t.end();
            });
    });
});


tap.test("Test games route", function(t) {
    startServer().then(function() {
        request(app).get("/api/games")
            .expect("Content-Type", /json/)
            .expect(200)
            .then(function(res) {
                t.same(res.body, { data: [
                    {
                        name: "Test game",
                        port: port + 1,
                        numPlayers: 0,
                        minPlayers: 2,
                        maxPlayers: 10,
                        timeout: 60
                    }
                ] }, "correct response received");
                t.end();
            }).catch(function(err) {
                t.fail(err.message);
                t.end();
            });
    });
});


tap.test("Test non-existing route", function(t) {
    startServer().then(function() {
        request(app).get("/api/foo")
            .expect(404)
            .then(function(res) {
                t.equal(res.text, "404 Not Found", "correct error message received");
                t.end();
            }).catch(function(err) {
                t.fail(err.message);
                t.end();
            });
    });
});
