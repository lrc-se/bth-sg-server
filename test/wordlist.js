/**
 * Tests for wordlist module.
 */

"use strict";

const tap = require("tap");
const wordlist = require("../services/wordlist.js");


tap.test("Test initial state", function(t) {
    let words = wordlist.getWords();
    t.same(words, []);
    t.end();
});
