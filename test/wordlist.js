/**
 * Tests for wordlist module.
 */

"use strict";

const tap = require("tap");
const Wordlist = require("../src/services/wordlist");


var wordlist;


tap.beforeEach(function() {
    wordlist = new Wordlist();
    return Promise.resolve();
});


tap.test("Test initial state", function(t) {
    let words = wordlist.getWords();
    t.same(words, [], "wordlist should be empty");
    t.end();
});


tap.test("Test wordlist loading from literal", function(t) {
    let words = ["foo", "bar", "baz"];
    wordlist.load(words);
    
    let words2 = wordlist.getWords();
    t.same(words2, words, "wordlist should match literal");
    t.end();
});


tap.test("Test wordlist loading from file", function(t) {
    wordlist.load("test/setup/words.json");
    
    let words = wordlist.getWords();
    t.same(words, ["foo", "bar", "baz", "quux"], "wordlist should match file contents");
    t.end();
});


tap.test("Test wordlist object independence", function(t) {
    let wordlist2 = new Wordlist();
    wordlist.load(["foo", "bar", "baz"]);
    wordlist2.load(["foo", "bar", "baz", "quux"]);
    
    t.notSame(wordlist2.getWords(), wordlist.getWords(), "wordlists should be different");
    t.end();
});


tap.test("Test word sequence", function(t) {
    wordlist.load("test/setup/words.json");
    
    let words = wordlist.getWords();
    let words2 = [];
    
    // traverse all words
    for (let i = 0; i < words.length; ++i) {
        let word = wordlist.getNextWord();
        t.notEqual(words.indexOf(word), -1, `returned word "${word}" should be found in wordlist`);
        words2.push(word);
    }
    
    // ascertain that all words have been traversed
    words.sort();
    words2.sort();
    t.same(words2, words, "accumulated list should match original wordlist");
    
    // ascertain sequence restart
    let word = wordlist.getNextWord();
    t.notEqual(
        words.indexOf(word),
        -1,
        `returned word "${word}" should be found in wordlist after sequence reset`
    );
    
    t.end();
});
