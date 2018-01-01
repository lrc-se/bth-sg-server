/**
 * Wordlist manager.
 *
 * @module  src/services/wordlist
 */

"use strict";

const fs = require("fs");


/**
 * Wordlist manager object prototype.
 */
const WordlistProto = {
    /**
     * Loads a wordlist from file (JSON) or literal array.
     *
     * @param   {(string|Array)}    src     Filename or array of words.
     */
    load(src) {
        if (src instanceof Array) {
            this._words = src;
        } else {
            this._words = JSON.parse(fs.readFileSync(src, { encoding: "UTF-8" }));
        }
    },
    
    
    /**
     * Returns a copy of the current wordlist.
     *
     * @returns {Array}     The wordlist.
     */
    getWords() {
        return this._words.slice();
    },
    
    
    /**
     * Returns the next word from the list in a randomized sequence,
     * starting over with a new random order when the whole list has been traversed.
     *
     * @returns {string}    Next word.
     */
    getNextWord() {
        if (!this._wordBuffer.length) {
            this._wordBuffer = this.getWords();
        }
        
        return this._wordBuffer.splice(Math.floor(Math.random() * this._wordBuffer.length), 1)[0];
    }
};


/**
 * Constructor function.
 *
 * @returns {object}    Wordlist manager object instance.
 */
function Wordlist() {
    let wordlist = Object.create(WordlistProto);
    wordlist._words = [];
    wordlist._wordBuffer = [];
    return wordlist;
}


module.exports = Wordlist;
