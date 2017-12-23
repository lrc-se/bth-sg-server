/**
 * Game routes.
 */

"use strict";

const express = require("express");
const gameController = require("../controllers/game");


var router = express.Router();


/**
 * Game index.
 */
router.get("/", gameController.index);


module.exports = router;
