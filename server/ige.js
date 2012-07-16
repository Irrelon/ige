// Set a global variable for the location of
// the node_modules folder
modulePath = '../server/node_modules/';

// Core
IgeBase = require('../engine/IgeBase');
IgeClass = require('../engine/IgeClass');
IgeEventingClass = require('../engine/IgeEventingClass');
IgePoint = require('../engine/IgePoint');
IgePoly2d = require('../engine/IgePoly2d');
IgeMatrix2d = require('../engine/IgeMatrix2d');
IgeMatrixStack = require('../engine/IgeMatrixStack');
// Components
IgeAnimationComponent = require('../engine/components/IgeAnimationComponent');
IgeVelocityComponent = require('../engine/components/IgeVelocityComponent');
IgeTweenComponent = require('../engine/components/IgeTweenComponent');
IgeInputComponent = require('../engine/components/IgeInputComponent');
// Extensions
IgeTransformExtension = require('../engine/extensions/IgeTransformExtension');
IgeUiPositionExtension = require('../engine/extensions/IgeUiPositionExtension');
IgeUiStyleExtension = require('../engine/extensions/IgeUiStyleExtension');
IgeUiInteractionExtension = require('../engine/extensions/IgeUiInteractionExtension');
// Classes
IgeTween = require('../engine/IgeTween');
IgeTexture = require('../engine/IgeTexture');
IgeCellSheet = require('../engine/IgeCellSheet');
IgeSpriteSheet = require('../engine/IgeSpriteSheet');
IgeFontSheet = require('../engine/IgeFontSheet');
IgeObject = require('../engine/IgeObject');
IgeEntity = require('../engine/IgeEntity');
IgeInteractiveEntity = require('../engine/IgeInteractiveEntity');
IgeUiEntity = require('../engine/IgeUiEntity');
IgeFontEntity = require('../engine/IgeFontEntity');
IgeParticleEmitter = require('../engine/IgeParticleEmitter');
IgeMap2d = require('../engine/IgeMap2d');
IgeTileMap2d = require('../engine/IgeTileMap2d');
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