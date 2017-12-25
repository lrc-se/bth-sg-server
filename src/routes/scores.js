/**
 * Score routes.
 */

"use strict";

const express = require("express");
const scoreController = require("../controllers/score");


var router = express.Router();


/**
 * Hiscore list.
 */
router.get("/", scoreController.index);


module.exports = router;
