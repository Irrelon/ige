// Set a global variable for the location of
// the node_modules folder
modulePath = '../server/node_modules/';

// Setup global variables and primitive extensions
require('../engine/IgeBase');

// Include engine core files
IgeClass = require('../engine/IgeClass');
IgeEventingClass = require('../engine/IgeEventingClass');
IgePoint = require('../engine/IgePoint');
IgeTransform = require('../engine/IgeTransform');
IgeTexture = require('../engine/IgeTexture');
IgeCellSheet = require('../engine/IgeCellSheet');
IgeSpriteSheet = require('../engine/IgeSpriteSheet');
IgeObject = require('../engine/IgeObject');
IgeEntity = require('../engine/IgeEntity');
IgeViewport = require('../engine/IgeViewport');
IgeScene2d = require('../engine/IgeScene2d');
IgeSceneIso = require('../engine/IgeSceneIso');
IgeEngine = require('../engine/IgeEngine');
IgeSocketIo = require('../engine/IgeSocketIo');

// Include the control class
IgeNode = require('./IgeNode');

// Start the app
var igeNode = new IgeNode();