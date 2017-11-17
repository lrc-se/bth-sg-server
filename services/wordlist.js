/**
 * Wordlist module.
 *
 * @module  services/wordlist
 */

"use strict";

const fs = require("fs");


var words = [];


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
    }
};


module.exports = Wordlist;
