// Set a global variable for the location of
// the node_modules folder
modulePath = '../server/node_modules/';

// Core
IgeBase = require('../engine/IgeBase');
IgeClass = require('../engine/IgeClass');
IgeEventingClass = require('../engine/IgeEventingClass');
IgePoint = require('../engine/IgePoint');
// Components
IgeAnimationComponent = require('../engine/components/IgeAnimationComponent');
IgeVelocityComponent = require('../engine/components/IgeVelocityComponent');
IgeTweenComponent = require('../engine/components/IgeTweenComponent');
// Extensions
IgeTransformExtension = require('../engine/extensions/IgeTransformExtension');
IgeUiPositionExtension = require('../engine/extensions/IgeUiPositionExtension');
IgeUiStyleExtension = require('../engine/extensions/IgeUiStyleExtension');
IgeUiInteractionExtension = require('../engine/extensions/IgeUiInteractionExtension');
// Classes
IgeTexture = require('../engine/IgeTexture');
IgeCellSheet = require('../engine/IgeCellSheet');
IgeSpriteSheet = require('../engine/IgeSpriteSheet');
IgeObject = require('../engine/IgeObject');
IgeEntity = require('../engine/IgeEntity');
IgeUiEntity = require('../engine/IgeUiEntity');
IgeCamera = require('../engine/IgeCamera');
IgeViewport = require('../engine/IgeViewport');
IgeScene2d = require('../engine/IgeScene2d');
IgeSceneUi = require('../engine/IgeSceneUi');
IgeSceneIso = require('../engine/IgeSceneIso');
IgeEngine = require('../engine/IgeEngine');
// Network
IgeDummyContext = require('../engine/network/IgeDummyContext');
IgeSocketIoComponent = require('../engine/network/IgeSocketIoComponent');

// Include the control class
IgeNode = require('./IgeNode');

// Start the app
var igeNode = new IgeNode();