/**
 * Route setup.
 *
 * @module src/routes/routes
 */

"use strict";

// route definitions
var routes = [
    {
        base: "/api",
        file: "api"
    }
];


module.exports = {
    /**
     * Sets up the application's routes.
     *
     * @param   {object}    app     Express application object.
     */
    setup(app) {
        for (let route of routes) {
            app.use(route.base, require("./" + route.file));
        }
    }
};
