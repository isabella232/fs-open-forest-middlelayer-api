/*

  ___ ___       ___               _ _       _   ___ ___ 
 | __/ __|  ___| _ \___ _ _ _ __ (_) |_    /_\ | _ \_ _|
 | _|\__ \ / -_)  _/ -_) '_| '  \| |  _|  / _ \|  _/| | 
 |_| |___/ \___|_| \___|_| |_|_|_|_|\__| /_/ \_\_| |___|

*/

//*******************************************************************

'use strict';

//*******************************************************************
// required modules

var express = require('express');
var router = express.Router();
var include = require('include')(__dirname);

var noncommercial = include('controllers/permits/special-uses/noncommercial');
//*******************************************************************
// router

// get all
router.get('/', function(req, res){

	res.json(noncommercial.get.all(req, res));

});

// get id
router.get('/:id(\\d+)', function(req, res){

	noncommercial.get.id(req, res);

});

// put id
router.put('/:id(\\d+)', function(req, res){

	noncommercial.put.id(req, res);

});

// post
router.post('/', function(req, res){

	noncommercial.post(req, res);

});

//*******************************************************************
// exports

module.exports = router;