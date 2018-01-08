/**
 * Tests for Skissa & Gissa server (gameplay).
 */

"use strict";

const tap = require("tap");
const http = require("http");
const WebSocket = require("ws");
const SgGame = require("../src/sg-game");


let port = process.env.SG_PORT || 1701;
let server;
let sockets = [];


function startGame(cfg) {
    return new Promise(function(resolve, reject) {
        cfg = cfg || {};
        SgGame({ httpServer: server }, {
            minPlayers: cfg.minPlayers || 2,
            maxPlayers: cfg.maxPlayers || 10,
            timeout: cfg.timeout || 60,
            delay: cfg.delay || 3,
            wordlist: "./words.json",
            saveScores: cfg.saveScores || false
        });
        server.listen(port, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}


function connect(nick, messageHandler, closeHandler, commands) {
    commands = commands || [];
    let socket = new WebSocket("ws://localhost:" + port);
    sockets.push(socket);
    socket.sendCmd = function(cmd, data) {
        this.send(JSON.stringify({ cmd, data }));
    };
    socket.onopen = function() {
        socket.sendCmd(commands[0] || "HOWDY");
    };
    socket.onmessage = function(e) {
        let data = JSON.parse(e.data);
        if (data.cmd == "GDAYMATE") {
            socket.sendCmd(commands[1] || "LEMMEIN", nick);
        } else {
            messageHandler(data);
        }
    };
    socket.onclose = closeHandler;
}


tap.beforeEach(function() {
    server = http.createServer();
    return Promise.resolve();
});


tap.afterEach(function(done) {
    for (let socket of sockets) {
        socket.close();
    }
    sockets = [];
    server.close(done);
});


tap.tearDown(process.exit);


tap.test("Test normal login", function(t) {
    startGame().then(function() {
        let status = 0;
        connect("John Doe", function(data) {
            switch (status++) {
                case 0:
                    t.equal(data.cmd, "CMONIN", "handshake successful");
                    break;
                case 1:
                    t.same(data, {
                        cmd: "POSSE",
                        data: [{ nick: "John Doe", points: 0 }]
                    }, "player list received");
                    break;
                case 2:
                    t.equal(
                        data.cmd,
                        "SHUTEYE",
                        "game paused due to insufficient number of players"
                    );
                    t.end();
                    break;
            }
        });
    });
});


tap.test("Test failed login (number of players)", function(t) {
    startGame({ maxPlayers: 1 }).then(function() {
        connect("John Doe", function(data) {
            if (data.cmd == "CMONIN") {
                connect("Jane Doe", function(data2) {
                    t.equal(data2.cmd, "FULLHOUSE", "correct rejection data received");
                    t.end();
                });
            }
        });
    });
});


tap.test("Test failed login (nick taken)", function(t) {
    startGame().then(function() {
        connect("John Doe", function(data) {
            if (data.cmd == "CMONIN") {
                connect("John Doe", function(data2) {
                    t.equal(data2.cmd, "DOPPELGANGER", "correct rejection data received");
                    t.end();
                });
            }
        });
    });
});


tap.test("Test failed login (erroneous handshake)", function(t) {
    startGame().then(function() {
        connect("John Doe", null, function(e) {
            t.same(
                [e.code, e.reason],
                [1002, "Invalid handshake"],
                "correct rejection data received (first step)"
            );
            connect("Jane Doe", null, function(e2) {
                t.same(
                    [e2.code, e2.reason],
                    [1002, "Invalid handshake"],
                    "correct rejection data received (second step)"
                );
                t.end();
            }, ["HOWDY", "IMALLYOURS"]);
        }, ["HIYA"]);
    });
});


tap.test("Test game start and end", function(t) {
    startGame().then(function() {
        connect("John Doe", function(data) {
            if (data.cmd == "PEEKABOO") {
                t.equal(data.data, "Jane Doe", "correct join message received");
            } else if (data.cmd == "CMONIN") {
                let status = 0;
                let isPlaying = false;
                connect("Jane Doe", function(data2) {
                    if (data2.cmd == "POSSE") {
                        isPlaying = true;
                    } else if (isPlaying) {
                        switch (status++) {
                            case 0:
                                t.same(data2, {
                                    cmd: "THEYREIT",
                                    data: "John Doe"
                                }, "correct player designated as drawer");
                                break;
                            case 1:
                                t.same(data2, {
                                    cmd: "TMINUS",
                                    data: 60
                                }, "countdown started");
                                sockets[0].sendCmd("SEEYA");
                                break;
                            case 2:
                                t.same(data2, {
                                    cmd: "SKEDADDLE",
                                    data: "John Doe"
                                }, "correct quit message received");
                                break;
                            case 3:
                                t.equal(
                                    data2.cmd,
                                    "SHUTEYE",
                                    "game paused due to insufficient number of players"
                                );
                                t.end();
                                break;
                        }
                    }
                });
            }
        });
    });
});


tap.test("Test broadcasts", function(t) {
    startGame().then(function() {
        connect("John Doe", function(data) {
            if (data.cmd == "CMONIN") {
                let isPlaying = false;
                let status = 0;
                let shape = {
                    type: "frect",
                    color: "#f00",
                    width: 5,
                    points: [[0, 0], [100, 100]]
                };
                let msg = {
                    type: "chat",
                    nick: "John Doe",
                    text: "test!"
                };
                connect("Jane Doe", function(data2) {
                    if (data2.cmd == "TMINUS") {
                        isPlaying = true;
                    }
                    if (isPlaying) {
                        switch (status++) {
                            case 0:
                                sockets[0].sendCmd("DOODLE", shape);
                                break;
                            case 1:
                                t.same(data2, {
                                    cmd: "DOODLE",
                                    data: shape
                                }, "correct drawing command received");
                                sockets[0].sendCmd("OOPS");
                                break;
                            case 2:
                                t.equal(data2.cmd, "OOPS", "undo shape command received");
                                sockets[0].sendCmd("SCRAP");
                                break;
                            case 3:
                                t.equal(data2.cmd, "SCRAP", "clear drawing command received");
                                sockets[0].sendCmd("QUOTH", msg.text);
                                break;
                            case 4:
                                t.same(data2, {
                                    cmd: "QUOTH",
                                    data: msg
                                }, "correct chat message received");
                                t.end();
                                break;
                        }
                    }
                });
            }
        });
    });
});


tap.test("Test game round", function(t) {
    startGame({ timeout: 1, delay: .5 }).then(function() {
        let word;
        connect("John Doe", function(data) {
            if (data.cmd == "YOUREIT") {
                word = data.data;
            } else if (data.cmd == "CMONIN") {
                let shape = {
                    type: "path",
                    color: "#00f",
                    width: 2,
                    points: [[47, 42], [42, 47]]
                };
                let msg = {
                    type: "chat",
                    nick: "Jane Doe",
                    text: "bla bla"
                };
                connect("Jane Doe", function(data2) {
                    if (data2.cmd == "YOUREIT") {
                        word = data2.data;
                    } else if (data2.cmd == "CMONIN") {
                        sockets[0].sendCmd("DOODLE", shape);
                        let isPlaying = false;
                        let status = 0;
                        connect("luser", function(data3) {
                            if (data3.cmd == "POSSE") {
                                isPlaying = true;
                            } else if (data3.cmd == "YOUREIT") {
                                status = 100;
                            }
                            if (isPlaying) {
                                switch (status++) {
                                    case 0:
                                        t.same(data3, {
                                            cmd: "POSSE",
                                            data: [
                                                {
                                                    nick: "John Doe",
                                                    points: 0
                                                },
                                                {
                                                    nick: "Jane Doe",
                                                    points: 0
                                                },
                                                {
                                                    nick: "luser",
                                                    points: 0
                                                }
                                            ]
                                        }, "correct player list received");
                                        break;
                                    case 1:
                                        t.same(data3, {
                                            cmd: "THEYREIT",
                                            data: "John Doe"
                                        }, "correct drawer announced");
                                        break;
                                    case 2:
                                        t.equal(data3.cmd, "TMINUS", "countdown announced");
                                        break;
                                    case 3:
                                        t.same(data3, {
                                            cmd: "DOODLE",
                                            data: shape
                                        }, "correct shape buffer received");
                                        sockets[1].sendCmd("QUOTH", msg.text);
                                        break;
                                    case 4:
                                        t.same(data3, {
                                            cmd: "QUOTH",
                                            data: msg
                                        }, "correct chat message received (incorrect guess)");
                                        msg.text = word.toLowerCase();
                                        sockets[1].sendCmd("QUOTH", msg.text);
                                        break;
                                    case 5:
                                        t.same(data3, {
                                            cmd: "QUOTH",
                                            data: msg
                                        }, "correct chat message received (correct guess)");
                                        break;
                                    case 6:
                                        t.same(data3, {
                                            cmd: "GOTIT",
                                            data: {
                                                nick: "Jane Doe",
                                                word: word
                                            }
                                        }, "correct guess announced");
                                        break;
                                    case 7:
                                        t.equal(
                                            data3.cmd,
                                            "POSSE",
                                            "updated player list received"
                                        );
                                        t.true(
                                            data3.data[0].points > 0,
                                            "drawer points registered"
                                        );
                                        t.true(
                                            data3.data[1].points > 0,
                                            "guesser points registered"
                                        );
                                        t.true(
                                            data3.data[1].points > data3.data[0].points,
                                            "guesser received more points than drawer"
                                        );
                                        break;
                                    case 8:
                                        t.same(data3, {
                                            cmd: "THEYREIT",
                                            data: "Jane Doe"
                                        }, "next drawer announced");
                                        break;
                                    case 9:
                                        break;
                                    case 10:
                                        t.same(data3, {
                                            cmd: "ITSABUST",
                                            data: word
                                        }, "correct failed word announced");
                                        break;
                                    case 103:
                                        t.same(data3, {
                                            cmd: "THEYREIT",
                                            data: "John Doe"
                                        }, "drawer sequence restarted");
                                        sockets[0].sendCmd("SEEYA");
                                        break;
                                    case 107:
                                        t.same(data3, {
                                            cmd: "THEYREIT",
                                            data: "Jane Doe",
                                        }, "turn passed to next drawer in sequence");
                                        sockets[1].close();
                                        break;
                                    case 111:
                                        t.equal(
                                            data3.cmd,
                                            "SHUTEYE",
                                            "game paused due to insufficient number of players"
                                        );
                                        t.end();
                                        break;
                                }
                            }
                        });
                    }
                });
            }
        });
    });
});
