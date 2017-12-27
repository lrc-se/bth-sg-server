/**
 * Info controller.
 */

"use strict";


module.exports = {
    /**
     * Server info.
     */
    index(req, res) {
        res.json({ data: {
            name: req.app.locals.name || "",
            type: "S&G",
            version: 1
        } });
    }
};
