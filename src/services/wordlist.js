/**
 * Wordlist module.
 *
 * @module  src/services/wordlist
 */

"use strict";

const fs = require("fs");


var words = [];
var wordBuffer = [];


const Wordlist = {
    /**
     * Loads a wordlist from file (JSON) or literal array.
     *
     * @param   {string|Array}  src     Filename or array of words.
     */
    load: function(src) {
        if (src instanceof Array) {
            words = src;
        } else {
            words = JSON.parse(fs.readFileSync(src, { encoding: "UTF-8" }));
        }
    },
    
    
    /**
     * Returns the current wordlist.
     *
     * @returns {Array}     The wordlist.
     */
    getWords: function() {
        return words.slice();
    },
    
    
    /**
     * Returns the next word from the list in a randomized sequence,
     * starting over with a new random order when the whole list has been traversed.
     *
     * @returns {string}    Next word.
     */
    getNextWord: function() {
        if (!wordBuffer.length) {
            wordBuffer = Wordlist.getWords();
        }
        
        return wordBuffer.splice(Math.floor(Math.random() * wordBuffer.length), 1)[0];
    }
};


module.exports = Wordlist;
