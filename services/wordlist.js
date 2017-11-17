/**
 * Wordlist module.
 *
 * @module  services/wordlist
 */

"use strict";

var words = [];


const Wordlist = {
    /**
     * Loads a wordlist from file (JSON) or literal array.
     *
     * @param   {string|Array}  src     Filename or array of words.
     */
    load: function(src) {
        // TODO
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
