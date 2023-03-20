"use strict";
var appCore = require('../../ige');
require('./space/_route');
require('./space/SpaceServer');
appCore.module('AppServer', function ($ige, $game) {
    var AppServer = function () {
        // Setup the $game storage for the server-side
        // This is the players object that stores player state per network
        // connection client id
        $game.players = {};
    };
    return AppServer;
});
