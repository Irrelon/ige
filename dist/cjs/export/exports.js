"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
//////////////////////////////////////////////////////////////////////
// Types
//////////////////////////////////////////////////////////////////////
__exportStar(require("../types/global"), exports);
__exportStar(require("../types/IgeAnyFunction"), exports);
__exportStar(require("../types/IgeAnyInterface"), exports);
__exportStar(require("../types/IgeAnyStringToFunctionInterface"), exports);
__exportStar(require("../types/IgeBehaviourStore"), exports);
__exportStar(require("../types/IgeBox2dBodyDef"), exports);
__exportStar(require("../types/IgeBox2dContactListenerCallback"), exports);
__exportStar(require("../types/IgeBox2dContactSolverCallback"), exports);
__exportStar(require("../types/IgeBox2dFixtureDef"), exports);
__exportStar(require("../types/IgeBox2dFixtureDefShape"), exports);
__exportStar(require("../types/IgeCanAcceptComponents"), exports);
__exportStar(require("../types/IgeCanAsyncLoad"), exports);
__exportStar(require("../types/IgeCanBeDestroyed"), exports);
__exportStar(require("../types/IgeCanIndexItems"), exports);
__exportStar(require("../types/IgeCanInit"), exports);
__exportStar(require("../types/IgeCanRegisterAndCanDestroy"), exports);
__exportStar(require("../types/IgeCanRegisterByCategory"), exports);
__exportStar(require("../types/IgeCanRegisterByGroup"), exports);
__exportStar(require("../types/IgeCanRegisterById"), exports);
__exportStar(require("../types/IgeCanvas"), exports);
__exportStar(require("../types/IgeCanvasRenderingContext2d"), exports);
__exportStar(require("../types/IgeChildSortFunction"), exports);
__exportStar(require("../types/IgeCompassDirection"), exports);
__exportStar(require("../types/IgeConfig"), exports);
__exportStar(require("../types/IgeDepthSortObject"), exports);
__exportStar(require("../types/IgeEntityBehaviour"), exports);
__exportStar(require("../types/IgeGenericClass"), exports);
__exportStar(require("../types/IgeImage"), exports);
__exportStar(require("../types/IgeIndexTreeNode"), exports);
__exportStar(require("../types/IgeInputEventControl"), exports);
__exportStar(require("../types/IgeInputEventHandler"), exports);
__exportStar(require("../types/IgeIsReadyPromise"), exports);
__exportStar(require("../types/IgeMixin"), exports);
__exportStar(require("../types/IgeNetworkChat"), exports);
__exportStar(require("../types/IgeNetworkMessage"), exports);
__exportStar(require("../types/IgeNetworkStream"), exports);
__exportStar(require("../types/IgeObjectWithValueProperty"), exports);
__exportStar(require("../types/IgePathFinderComparisonCallback"), exports);
__exportStar(require("../types/IgePoint"), exports);
__exportStar(require("../types/IgePointXY"), exports);
__exportStar(require("../types/IgeShapeFunctionality"), exports);
__exportStar(require("../types/IgeRepeatType"), exports);
__exportStar(require("../types/IgeRouteDefinition"), exports);
__exportStar(require("../types/IgeSceneGraphDataEntry"), exports);
__exportStar(require("../types/IgeSmartFilter"), exports);
__exportStar(require("../types/IgeSmartTexture"), exports);
__exportStar(require("../types/IgeStreaming"), exports);
__exportStar(require("../types/IgeSyncEntry"), exports);
__exportStar(require("../types/IgeTextureAnimation"), exports);
__exportStar(require("../types/IgeTextureCell"), exports);
__exportStar(require("../types/IgeTextureCellArray"), exports);
__exportStar(require("../types/IgeTimeStream"), exports);
__exportStar(require("../types/IgeTriggerPolygonFunctionName"), exports);
__exportStar(require("../types/IgeUiStyleModifier"), exports);
__exportStar(require("../types/IgeUiStyleObject"), exports);
__exportStar(require("../types/IgeVec3"), exports);
__exportStar(require("../types/IgeVec4"), exports);
__exportStar(require("../types/IgeVec6"), exports);
//////////////////////////////////////////////////////////////////////
// Enums
//////////////////////////////////////////////////////////////////////
__exportStar(require("../enums/IgeTextureRenderMode"), exports);
__exportStar(require("../enums/IgeStreamMode"), exports);
__exportStar(require("../enums/IgeNetworkConstants"), exports);
__exportStar(require("../enums/IgeMountMode"), exports);
__exportStar(require("../enums/IgeIsometricDepthSortMode"), exports);
__exportStar(require("../enums/IgeInputDeviceMap"), exports);
__exportStar(require("../enums/IgeFontAlign"), exports);
__exportStar(require("../enums/IgeEventReturnFlag"), exports);
__exportStar(require("../enums/IgeEntityRenderMode"), exports);
__exportStar(require("../enums/IgeEngineState"), exports);
__exportStar(require("../enums/IgeBox2dTimingMode"), exports);
__exportStar(require("../enums/IgeBox2dFixtureShapeType"), exports);
__exportStar(require("../enums/IgeBox2dBodyType"), exports);
__exportStar(require("../enums/IgeBehaviourType"), exports);
__exportStar(require("../enums/IgeAudioSourceType"), exports);
__exportStar(require("../enums/IgeNetworkConnectionState"), exports);
//////////////////////////////////////////////////////////////////////
// Class Store
//////////////////////////////////////////////////////////////////////
__exportStar(require("../engine/utils/igeClassStore"), exports);
//////////////////////////////////////////////////////////////////////
// Engine Main Classes
//////////////////////////////////////////////////////////////////////
__exportStar(require("../engine/core/_global"), exports);
__exportStar(require("../engine/core/config"), exports);
__exportStar(require("../engine/core/IgeBaseClass"), exports);
__exportStar(require("../engine/core/IgeSceneGraph"), exports);
__exportStar(require("../engine/core/IgeEventingClass"), exports);
__exportStar(require("../engine/core/IgeFSM"), exports);
__exportStar(require("../engine/core/IgeMap2d"), exports);
__exportStar(require("../engine/core/IgeMapStack2d"), exports);
__exportStar(require("../engine/core/IgeMatrix2d"), exports);
__exportStar(require("../engine/core/IgeRouter"), exports);
__exportStar(require("../engine/utils/arrays"), exports);
__exportStar(require("../engine/utils/clientServer"), exports);
__exportStar(require("../engine/utils/easing"), exports);
__exportStar(require("../engine/utils/general"), exports);
__exportStar(require("../engine/utils/ids"), exports);
__exportStar(require("../engine/utils/igeFilters"), exports);
__exportStar(require("../engine/utils/maths"), exports);
__exportStar(require("../engine/utils/mixin"), exports);
__exportStar(require("../engine/utils/octaHash"), exports);
__exportStar(require("../engine/utils/trace"), exports);
__exportStar(require("../engine/textures/IgeTileMap2dSmartTexture"), exports);
__exportStar(require("../engine/textures/IgeFontSmartTexture"), exports);
__exportStar(require("../engine/textures/IgeCuboidSmartTexture"), exports);
__exportStar(require("../engine/core/IgeIndexTree"), exports);
__exportStar(require("../engine/core/IgeObjectRegister"), exports);
__exportStar(require("../engine/core/IgeOptions"), exports);
__exportStar(require("../engine/core/IgeMetrics"), exports);
__exportStar(require("../engine/core/IgeDummyContext"), exports);
__exportStar(require("../engine/core/IgeDummyCanvas"), exports);
__exportStar(require("../engine/core/IgeDependencies"), exports);
__exportStar(require("../engine/core/IgeComponent"), exports);
__exportStar(require("../engine/core/IgeAsset"), exports);
__exportStar(require("../engine/core/IgeAssetRegister"), exports);
__exportStar(require("../engine/core/IgeArrayRegister"), exports);
__exportStar(require("../engine/core/IgeQuest"), exports);
__exportStar(require("../engine/core/IgeGenericPathFinder"), exports);
__exportStar(require("../engine/core/IgeCanvas"), exports);
__exportStar(require("../engine/components/audio/IgeAudioController.js"), exports);
__exportStar(require("../engine/network/client/IgeNetIoClient"), exports);
__exportStar(require("../engine/network/server/IgeNetIoSocket"), exports);
__exportStar(require("../engine/network/server/IgeNetIoServer"), exports);
__exportStar(require("../engine/network/IgeNetIoBaseController"), exports);
__exportStar(require("../engine/core/IgePoint2d"), exports);
__exportStar(require("../engine/core/IgePoint3d"), exports);
__exportStar(require("../engine/core/IgeBounds"), exports);
__exportStar(require("../engine/core/IgeRect"), exports);
__exportStar(require("../engine/core/IgeCircle"), exports);
__exportStar(require("../engine/core/IgeObject"), exports);
__exportStar(require("../engine/core/IgeEntity"), exports);
__exportStar(require("../engine/core/IgeCamera"), exports);
__exportStar(require("../engine/core/IgeBaseRenderer"), exports);
__exportStar(require("../engine/core/IgeCanvas2dRenderer"), exports);
__exportStar(require("../engine/core/IgeEngine"), exports);
__exportStar(require("../engine/network/chat/IgeChatComponent"), exports);
__exportStar(require("../engine/core/IgeUiEntity"), exports);
__exportStar(require("../engine/core/IgeUiElement"), exports);
__exportStar(require("../engine/core/IgeInterval"), exports);
__exportStar(require("../engine/core/IgeTimeout"), exports);
__exportStar(require("../engine/primitives/IgeCuboid"), exports);
__exportStar(require("../engine/network/server/IgeNetIoServerController"), exports);
__exportStar(require("../engine/network/client/IgeNetIoClientController"), exports);
__exportStar(require("../engine/network/chat/IgeChatServer"), exports);
__exportStar(require("../engine/network/chat/IgeChatClient"), exports);
//////////////////////////////////////////////////////////////////////
// Mixins
//////////////////////////////////////////////////////////////////////
__exportStar(require("../engine/mixins/IgeUiStyleMixin"), exports);
__exportStar(require("../engine/mixins/IgeUiPositionMixin"), exports);
__exportStar(require("../engine/mixins/IgeExampleMixin"), exports);
__exportStar(require("../engine/mixins/IgeEventingMixin"), exports);
__exportStar(require("../engine/mixins/IgeDataMixin"), exports);
__exportStar(require("../engine/mixins/IgeComponentMixin"), exports);
//////////////////////////////////////////////////////////////////////
// Image Filters
//////////////////////////////////////////////////////////////////////
__exportStar(require("../engine/filters/threshold"), exports);
__exportStar(require("../engine/filters/sobel"), exports);
__exportStar(require("../engine/filters/sharpen"), exports);
__exportStar(require("../engine/filters/outlineDetect"), exports);
__exportStar(require("../engine/filters/invert"), exports);
__exportStar(require("../engine/filters/greyScale"), exports);
__exportStar(require("../engine/filters/glowMask"), exports);
__exportStar(require("../engine/filters/emboss"), exports);
__exportStar(require("../engine/filters/edgeEnhance"), exports);
__exportStar(require("../engine/filters/edgeDetect"), exports);
__exportStar(require("../engine/filters/convolute"), exports);
__exportStar(require("../engine/filters/colorOverlay"), exports);
__exportStar(require("../engine/filters/brighten"), exports);
__exportStar(require("../engine/filters/blur"), exports);
//////////////////////////////////////////////////////////////////////
// Some More Engine Classes (export order matters to avoid circular refs)
//////////////////////////////////////////////////////////////////////
__exportStar(require("../engine/core/IgeViewport"), exports);
__exportStar(require("../engine/core/IgeUiManagerController"), exports);
__exportStar(require("../engine/core/IgeTweenController"), exports);
__exportStar(require("../engine/core/IgeTween"), exports);
__exportStar(require("../engine/core/IgeTimeController"), exports);
__exportStar(require("../engine/core/IgeTileMap2d"), exports);
__exportStar(require("../engine/core/IgeTextureStore"), exports);
__exportStar(require("../engine/core/IgeTextureMap"), exports);
__exportStar(require("../engine/core/IgeTextureAtlas"), exports);
__exportStar(require("../engine/core/IgeTexture"), exports);
__exportStar(require("../engine/core/IgeSpriteSheet"), exports);
__exportStar(require("../engine/core/IgeScene2d"), exports);
__exportStar(require("../engine/core/IgePoly2d"), exports);
__exportStar(require("../engine/core/IgePathNode"), exports);
__exportStar(require("../engine/core/IgePathFinder"), exports);
__exportStar(require("../engine/core/IgeParticleEmitter"), exports);
__exportStar(require("../engine/core/IgeParticle"), exports);
__exportStar(require("../engine/core/IgeFontSheet"), exports);
__exportStar(require("../engine/core/IgeFontEntity"), exports);
__exportStar(require("../engine/core/IgeCollisionMap2d"), exports);
__exportStar(require("../engine/core/IgeCellSheet"), exports);
__exportStar(require("../engine/core/IgeBaseScene"), exports);
//////////////////////////////////////////////////////////////////////
// Components
//////////////////////////////////////////////////////////////////////
__exportStar(require("../engine/components/stackTrace/lib_stack"), exports);
__exportStar(require("../engine/components/physics/box2d/lib/exports"), exports);
__exportStar(require("../engine/components/physics/box2d/igeBox2dContactHelpers"), exports);
__exportStar(require("../engine/components/physics/box2d/IgeEntityBox2d"), exports);
__exportStar(require("../engine/components/physics/box2d/IgeBox2dDebugPainter"), exports);
__exportStar(require("../engine/components/physics/box2d/IgeBox2dDebugDraw"), exports);
__exportStar(require("../engine/components/physics/box2d/IgeBox2dController"), exports);
__exportStar(require("../engine/components/entityManager/IgeEntityManager"), exports);
__exportStar(require("../engine/components/IgeVelocityComponent"), exports);
__exportStar(require("../engine/components/IgeTiledComponent"), exports);
__exportStar(require("../engine/components/IgeTextureAnimationComponent"), exports);
__exportStar(require("../engine/components/IgePathComponent"), exports);
__exportStar(require("../engine/components/IgeMouseZoomComponent"), exports);
__exportStar(require("../engine/components/IgeMousePanComponent"), exports);
__exportStar(require("../engine/components/IgeInputControlMap"), exports);
__exportStar(require("../engine/components/IgeInputComponent"), exports);
__exportStar(require("../engine/components/IgeGamePadComponent"), exports);
__exportStar(require("../engine/components/IgeEntityManagerComponent"), exports);
__exportStar(require("../engine/components/audio/IgeSmartAudioSource.js"), exports);
__exportStar(require("../engine/components/audio/IgeAudioSource.js"), exports);
__exportStar(require("../engine/components/audio/IgeAudioControl.js"), exports);
__exportStar(require("../engine/components/audio/IgeAudioEntity.js"), exports);
//////////////////////////////////////////////////////////////////////
// UI Element Classes
//////////////////////////////////////////////////////////////////////
__exportStar(require("../engine/ui/IgeUiWindow"), exports);
__exportStar(require("../engine/ui/IgeUiTooltip"), exports);
__exportStar(require("../engine/ui/IgeUiTogglePanel"), exports);
__exportStar(require("../engine/ui/IgeUiTextBox"), exports);
__exportStar(require("../engine/ui/IgeUiTabPanel"), exports);
__exportStar(require("../engine/ui/IgeUiSlider"), exports);
__exportStar(require("../engine/ui/IgeUiRow"), exports);
__exportStar(require("../engine/ui/IgeUiButton"), exports);
__exportStar(require("../engine/ui/IgeUiRadioButton"), exports);
__exportStar(require("../engine/ui/IgeUiProgressBar"), exports);
__exportStar(require("../engine/ui/IgeUiLabel"), exports);
__exportStar(require("../engine/ui/IgeUiInlineFlow"), exports);
__exportStar(require("../engine/ui/IgeUiDropDown"), exports);
__exportStar(require("../engine/ui/IgeUiColumn"), exports);
__exportStar(require("../engine/ui/IgeUiAutoFlow"), exports);
//////////////////////////////////////////////////////////////////////
// Finally, the core Ige class and then the global class instance
//////////////////////////////////////////////////////////////////////
__exportStar(require("../engine/core/Ige"), exports);
