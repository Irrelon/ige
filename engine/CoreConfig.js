var igeCoreConfig = {
	include: [
		/* Client-Side Stack Trace Support */
		['c', 'IgeStackTrace', 'components/stackTrace/lib_stack.js'],
		/* The IGE Core Files */
		['csa', 'IgeBase', 'core/IgeBase.js'],
		['csa', 'IgeClass', 'core/IgeClass.js'],
		['csa', 'IgeEventingClass', 'core/IgeEventingClass.js'],
		['ca', 'IgeTest', 'core/IgeTest.js'],
		/* Data Classes */
		['csa', 'IgePoint', 'core/IgePoint.js'],
		['csa', 'IgePoly2d', 'core/IgePoly2d.js'],
		['csa', 'IgeRect', 'core/IgeRect.js'],
		['csa', 'IgeMatrix2d', 'core/IgeMatrix2d.js'],
		['csa', 'IgeMatrixStack', 'core/IgeMatrixStack.js'],
		/* Components */
		['csa', 'IgeAnimationComponent', 'components/IgeAnimationComponent.js'],
		['csa', 'IgeVelocityComponent', 'components/IgeVelocityComponent.js'],
		['csa', 'IgeTweenComponent', 'components/IgeTweenComponent.js'],
		['csa', 'IgePathComponent', 'components/IgePathComponent.js'],
		['csa', 'IgeInputComponent', 'components/IgeInputComponent.js'],
		['csa', 'IgeMousePanComponent', 'components/IgeMousePanComponent.js'],
		['csa', 'IgeMouseZoomComponent', 'components/IgeMouseZoomComponent.js'],
		['csa', 'IgeTiledComponent', 'components/IgeTiledComponent.js'],
		['csa', 'IgeEntityManagerComponent', 'components/IgeEntityManagerComponent.js'],
		/* Physics Libraries */
		['csa', 'Box2D', 'components/physics/box2d/lib_box2d.js', 'Box2D'],
		['csa', 'Cannon', 'components/physics/cannon/lib_cannon.js'],
		['csa', 'IgeCannonComponent', 'components/physics/cannon/IgeCannonComponent.js'],
		/* Network Stream */
		['csa', 'IgeTimeSyncExtension', 'components/network/IgeTimeSyncExtension.js'],
		['csa', 'IgeStreamComponent', 'components/network/stream/IgeStreamComponent.js'],
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
		['csa', 'IgeCocoonJsComponent', 'components/cocoonjs/IgeCocoonJsComponent.js'],
		/* General Extensions */
		['csa', 'IgeTransformExtension', 'extensions/IgeTransformExtension.js'],
		['csa', 'IgeUiPositionExtension', 'extensions/IgeUiPositionExtension.js'],
		['csa', 'IgeUiStyleExtension', 'extensions/IgeUiStyleExtension.js'],
		['csa', 'IgeUiInteractionExtension', 'extensions/IgeUiInteractionExtension.js'],
		/* Main Engine Classes */
		['csa', 'IgeDummyContext', 'core/IgeDummyContext.js'],
		['csa', 'IgePathNode', 'core/IgePathNode.js'],
		['csa', 'IgePathFinder', 'core/IgePathFinder.js'],
		['csa', 'IgeTween', 'core/IgeTween.js'],
		['csa', 'IgeTexture', 'core/IgeTexture.js'],
		['csa', 'IgeCellSheet', 'core/IgeCellSheet.js'],
		['csa', 'IgeSpriteSheet', 'core/IgeSpriteSheet.js'],
		['csa', 'IgeFontSheet', 'core/IgeFontSheet.js'],
		['csa', 'IgeObject', 'core/IgeObject.js'],
		['csa', 'IgeEntity', 'core/IgeEntity.js'],
		['csa', 'IgeUiEntity', 'core/IgeUiEntity.js'],
		['csa', 'IgeFontEntity', 'core/IgeFontEntity.js'],
		['csa', 'IgeParticleEmitter', 'core/IgeParticleEmitter.js'],
		['csa', 'IgeMap2d', 'core/IgeMap2d.js'],
		['csa', 'IgeMapStack2d', 'core/IgeMapStack2d.js'],
		['csa', 'IgeTileMap2d', 'core/IgeTileMap2d.js'],
		['csa', 'IgeTextureMap', 'core/IgeTextureMap.js'],
		['csa', 'IgeCollisionMap2d', 'core/IgeCollisionMap2d.js'],
		['csa', 'IgeCamera', 'core/IgeCamera.js'],
		['csa', 'IgeViewport', 'core/IgeViewport.js'],
		['csa', 'IgeScene2d', 'core/IgeScene2d.js'],
		['csa', 'IgeQuest', 'core/IgeQuest.js'],
		/* Physics to Entity Components */
		['csa', 'IgeBox2dComponent', 'components/physics/box2d/IgeBox2dComponent.js'],
		['csa', 'IgeEntityBox2d', 'components/physics/box2d/IgeEntityBox2d.js'],
		['csa', 'IgeEntityCannon', 'components/physics/cannon/IgeEntityCannon.js'],
		/* UI Classes */
		['csa', 'IgeUiButton', 'ui/IgeUiButton.js'],
		['csa', 'IgeUiRadioButton', 'ui/IgeUiRadioButton.js'],
		['csa', 'IgeUiProgressBar', 'ui/IgeUiProgressBar.js'],
		['csa', 'IgeUiTextBox', 'ui/IgeUiTextBox.js'],
		['csa', 'IgeUiMenu', 'ui/IgeUiMenu.js'],
		/* Image Filters */
		['ca', 'IgeFilters', 'core/IgeFilters.js'],
		['ca', 'IgeFilters._convolute', 'filters/convolute.js'],
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
		['ca', 'THREE', 'components/three/three.min.js'],
		['ca', 'IgeThree', 'components/three/IgeThree.js'],
		/* Engine Actual */
		['csa', 'IgeEngine', 'core/IgeEngine.js']
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeCoreConfig; }