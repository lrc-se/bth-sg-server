/**
 * Wordlist module.
 *
 * @module  services/wordlist
 */

"use strict";

var words = [];


const Wordlist = {
    /**
     * Returns the current wordlist.
     *
     * @returns {Array}     The wordlist.
     */
    getWords: function() {
        return words;
    }
};


module.exports = Wordlist;
