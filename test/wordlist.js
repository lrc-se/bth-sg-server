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


tap.test("Test wordlist loading from literal", function(t) {
    let words = ["foo", "bar", "baz"];
    wordlist.load(words);
    
    let words2 = wordlist.getWords();
    t.same(words2, words);
    t.end();
});
