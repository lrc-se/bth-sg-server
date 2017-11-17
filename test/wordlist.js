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
    t.same(words, [], "wordlist should be empty");
    t.end();
});


tap.test("Test wordlist loading from literal", function(t) {
    const wordlist = loadModule();
    let words = ["foo", "bar", "baz"];
    wordlist.load(words);
    
    let words2 = wordlist.getWords();
    t.same(words2, words, "wordlist should match literal");
    t.end();
});


tap.test("Test wordlist loading from file", function(t) {
    const wordlist = loadModule();
    wordlist.load("test/words.json");
    
    let words = wordlist.getWords();
    t.same(words, ["foo", "bar", "baz", "quux"], "wordlist should match file contents");
    t.end();
});


tap.test("Test word sequence", function(t) {
    const wordlist = loadModule();
    wordlist.load("test/words.json");
    
    let words = wordlist.getWords();
    let words2 = [];
    
    // traverse all words
    for (let i = 0; i < words.length; ++i) {
        let word = wordlist.getNextWord();
        t.notEqual(words.indexOf(word), -1, `"${word}" should be found in wordlist`);
        words2.push(word);
    }
    
    // ascertain that all words have been traversed
    words.sort();
    words2.sort();
    t.same(words2, words, "accumulated list should match original wordlist");
    
    // ascertain sequence restart
    let word = wordlist.getNextWord();
    t.notEqual(words.indexOf(word), -1, `"${word}" should be found in wordlist after sequence reset`);
    
    t.end();
});
