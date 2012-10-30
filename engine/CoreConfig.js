var igeCoreConfig = {
	include: [
		/* Client-Side Stack Trace Support */
		['c', 'IgeStackTrace', 'components/stackTrace/lib_stack.js'],
		/* The IGE Core Files */
		['cs', 'IgeBase', 'core/IgeBase.js'],
		['cs', 'IgeClass', 'core/IgeClass.js'],
		['cs', 'IgeEventingClass', 'core/IgeEventingClass.js'],
		['ca', 'IgeTest', 'core/IgeTest.js'],
		/* Data Classes */
		['cs', 'IgePoint', 'core/IgePoint.js'],
		['cs', 'IgePoly2d', 'core/IgePoly2d.js'],
		['cs', 'IgeRect', 'core/IgeRect.js'],
		['cs', 'IgeMatrix2d', 'core/IgeMatrix2d.js'],
		['csa', 'IgeMatrixStack', 'core/IgeMatrixStack.js'],
		/* Components */
		['csa', 'IgeAnimationComponent', 'components/IgeAnimationComponent.js'],
		['csa', 'IgeVelocityComponent', 'components/IgeVelocityComponent.js'],
		['cs', 'IgeTweenComponent', 'components/IgeTweenComponent.js'],
		['csa', 'IgePathComponent', 'components/IgePathComponent.js'],
		['cs', 'IgeInputComponent', 'components/IgeInputComponent.js'],
		['csa', 'IgeMousePanComponent', 'components/IgeMousePanComponent.js'],
		['csa', 'IgeMouseZoomComponent', 'components/IgeMouseZoomComponent.js'],
		['csa', 'IgeTiledComponent', 'components/IgeTiledComponent.js'],
		['csa', 'IgeEntityManagerComponent', 'components/IgeEntityManagerComponent.js'],
		/* Physics Libraries */
		['csa', 'Box2D', 'components/physics/box2d/lib_box2d.js', 'Box2D'],
		['csa', 'Cannon', 'components/physics/cannon/lib_cannon.js'],
		['csa', 'IgeCannonComponent', 'components/physics/cannon/IgeCannonComponent.js'],
		/* Network Stream */
		['cs', 'IgeTimeSyncExtension', 'components/network/IgeTimeSyncExtension.js'],
		['cs', 'IgeStreamComponent', 'components/network/stream/IgeStreamComponent.js'],
		/* Socket.io */
		['ca', 'SocketIo', 'components/network/socket.io/client/socket.io.min.js'],
		['ca', 'IgeSocketIoClient', 'components/network/socket.io/IgeSocketIoClient.js'],
		['sa', 'IgeSocketIoServer', 'components/network/socket.io/IgeSocketIoServer.js'],
		['csa', 'IgeSocketIoComponent', 'components/network/socket.io/IgeSocketIoComponent.js'],
		/* Net.io */
		['ca', 'NetIo', 'components/network/net.io/net.io-client/index.js'],
		['ca', 'IgeNetIoClient', 'components/network/net.io/IgeNetIoClient.js'],
		['sa', 'IgeNetIoServer', 'components/network/net.io/IgeNetIoServer.js'],
		['csa', 'IgeNetIoComponent', 'components/network/net.io/IgeNetIoComponent.js'],
		/* Chat System */
		['ca', 'IgeChatClient', 'components/chat/IgeChatClient.js'],
		['sa', 'IgeChatServer', 'components/chat/IgeChatServer.js'],
		['csa', 'IgeChatComponent', 'components/chat/IgeChatComponent.js'],
		/* MySQL Support */
		['sa', 'IgeMySql', 'components/database/mysql/IgeMySql.js'],
		['sa', 'IgeMySqlComponent', 'components/database/mysql/IgeMySqlComponent.js'],
		/* MongoDB Support */
		['sa', 'IgeMongoDb', 'components/database/mongodb/IgeMongoDb.js'],
		['sa', 'IgeMongoDbComponent', 'components/database/mongodb/IgeMongoDbComponent.js'],
		/* CocoonJS Support */
		['cs', 'IgeCocoonJsComponent', 'components/cocoonjs/IgeCocoonJsComponent.js'],
		/* General Extensions */
		['cs', 'IgeTransformExtension', 'extensions/IgeTransformExtension.js'],
		['cs', 'IgeUiPositionExtension', 'extensions/IgeUiPositionExtension.js'],
		['cs', 'IgeUiStyleExtension', 'extensions/IgeUiStyleExtension.js'],
		['cs', 'IgeUiInteractionExtension', 'extensions/IgeUiInteractionExtension.js'],
		/* Main Engine Classes */
		['cs', 'IgeDummyContext', 'core/IgeDummyContext.js'],
		['cs', 'IgePathNode', 'core/IgePathNode.js'],
		['cs', 'IgePathFinder', 'core/IgePathFinder.js'],
		['cs', 'IgeTween', 'core/IgeTween.js'],
		['cs', 'IgeTexture', 'core/IgeTexture.js'],
		['cs', 'IgeCellSheet', 'core/IgeCellSheet.js'],
		['cs', 'IgeSpriteSheet', 'core/IgeSpriteSheet.js'],
		['cs', 'IgeFontSheet', 'core/IgeFontSheet.js'],
		['cs', 'IgeObject', 'core/IgeObject.js'],
		['cs', 'IgeEntity', 'core/IgeEntity.js'],
		['cs', 'IgeUiEntity', 'core/IgeUiEntity.js'],
		['cs', 'IgeFontEntity', 'core/IgeFontEntity.js'],
		['cs', 'IgeParticleEmitter', 'core/IgeParticleEmitter.js'],
		['cs', 'IgeMap2d', 'core/IgeMap2d.js'],
		['cs', 'IgeMapStack2d', 'core/IgeMapStack2d.js'],
		['cs', 'IgeTileMap2d', 'core/IgeTileMap2d.js'],
		['cs', 'IgeTextureMap', 'core/IgeTextureMap.js'],
		['cs', 'IgeCollisionMap2d', 'core/IgeCollisionMap2d.js'],
		['cs', 'IgeCamera', 'core/IgeCamera.js'],
		['cs', 'IgeViewport', 'core/IgeViewport.js'],
		['cs', 'IgeScene2d', 'core/IgeScene2d.js'],
		['cs', 'IgeQuest', 'core/IgeQuest.js'],
		/* Physics to Entity Components */
		['csa', 'IgeBox2dComponent', 'components/physics/box2d/IgeBox2dComponent.js'],
		['csa', 'IgeEntityBox2d', 'components/physics/box2d/IgeEntityBox2d.js'],
		['csa', 'IgeEntityCannon', 'components/physics/cannon/IgeEntityCannon.js'],
		/* UI Classes */
		['cs', 'IgeUiButton', 'ui/IgeUiButton.js'],
		['cs', 'IgeUiRadioButton', 'ui/IgeUiRadioButton.js'],
		['cs', 'IgeUiProgressBar', 'ui/IgeUiProgressBar.js'],
		['cs', 'IgeUiTextBox', 'ui/IgeUiTextBox.js'],
		['cs', 'IgeUiMenu', 'ui/IgeUiMenu.js'],
		/* Image Filters */
		['ca', 'IgeFilters', 'core/IgeFilters.js'],
		['ca', 'IgeFilters.convolute', 'filters/convolute.js'],
		['ca', 'IgeFilters.greyScale', 'filters/greyScale.js'],
		['ca', 'IgeFilters.brighten', 'filters/brighten.js'],
		['ca', 'IgeFilters.threshold', 'filters/threshold.js'],
		['ca', 'IgeFilters.sharpen', 'filters/sharpen.js'],
		['ca', 'IgeFilters.blur', 'filters/blur.js'],
		['ca', 'IgeFilters.emboss', 'filters/emboss.js'],
		['ca', 'IgeFilters.edgeDetect', 'filters/edgeDetect.js'],
		['ca', 'IgeFilters.edgeEnhance', 'filters/edgeEnhance.js'],
		['ca', 'IgeFilters.outlineDetect', 'filters/outlineDetect.js'],
		['ca', 'IgeFilters.colorOverlay', 'filters/colorOverlay.js'],
		/* WebGL */
		['ca', 'three', 'components/three/three.min.js'],
		['ca', 'IgeThree', 'components/three/IgeThree.js'],
		/* Engine Actual */
		['cs', 'IgeEngine', 'core/IgeEngine.js']
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeCoreConfig; }