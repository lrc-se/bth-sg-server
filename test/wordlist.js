/**
 * Tests for wordlist module.
 */

"use strict";

const tap = require("tap");


function loadModule() {
    const path = "../services/wordlist";
    delete require.cache[require.resolve(path)];
    return require(path);
}


tap.test("Test initial state", function(t) {
    const wordlist = loadModule();
    let words = wordlist.getWords();
    t.same(words, []);
    t.end();
});


tap.test("Test wordlist loading from literal", function(t) {
    const wordlist = loadModule();
    let words = ["foo", "bar", "baz"];
    wordlist.load(words);
    
    let words2 = wordlist.getWords();
    t.same(words2, words);
    t.end();
});


tap.test("Test wordlist loading from file", function(t) {
    const wordlist = loadModule();
    wordlist.load("words.json");
    
    let words = wordlist.getWords();
    t.same(words, ["foo", "bar", "baz", "quux"]);
    t.end();
});
