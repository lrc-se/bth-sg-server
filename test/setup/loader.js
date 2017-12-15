/**
 * Uncached loader for root project modules.
 *
 * @module  test/setup/loader
 */

"use strict";


/**
 * Loads a project module afresh, bypassing the internal module cache.
 *
 * @param   {string}    Module path relative to project root.
 *
 * @returns {object}    Loaded module.
 */
module.exports = function(mod) {
    let path = "../../src/" + mod;
    delete require.cache[require.resolve(path)];
    return require(path);
};
