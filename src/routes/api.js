/**
 * API routes.
 */

"use strict";

const express = require("express");
const infoController = require("../controllers/info");
const gameController = require("../controllers/game");
const scoreController = require("../controllers/score");


var router = express.Router();


/**
 * Server info.
 */
router.get("/info", infoController.index);


/**
 * Game list.
 */
router.get("/games", gameController.index);


/**
 * Hiscore list.
 */
router.get("/scores", scoreController.index);


module.exports = router;
