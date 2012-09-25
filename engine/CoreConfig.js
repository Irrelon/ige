var igeCoreConfig = {
	include: [
		/* Client-Side Stack Trace Support */
		['c', 'IgeStackTrace', 'components/stackTrace/lib_stack.js'],
		/* The IGE Core Files */
		['cs', 'IgeBase', 'core/IgeBase.js'],
		['cs', 'IgeClass', 'core/IgeClass.js'],
		['cs', 'IgeEventingClass', 'core/IgeEventingClass.js'],
		/* Data Classes */
		['cs', 'IgePoint', 'core/IgePoint.js'],
		['cs', 'IgePoly2d', 'core/IgePoly2d.js'],
		['cs', 'IgeRect', 'core/IgeRect.js'],
		['cs', 'IgeMatrix2d', 'core/IgeMatrix2d.js'],
		['cs', 'IgeMatrixStack', 'core/IgeMatrixStack.js'],
		/* Components */
		['s', 'IgeDummyContext', 'components/network/IgeDummyContext.js'],
		['cs', 'IgeAnimationComponent', 'components/IgeAnimationComponent.js'],
		['cs', 'IgeVelocityComponent', 'components/IgeVelocityComponent.js'],
		['cs', 'IgeTweenComponent', 'components/IgeTweenComponent.js'],
		['cs', 'IgePathComponent', 'components/IgePathComponent.js'],
		['cs', 'IgeInputComponent', 'components/IgeInputComponent.js'],
		['cs', 'IgeMousePanComponent', 'components/IgeMousePanComponent.js'],
		['cs', 'IgeMouseZoomComponent', 'components/IgeMouseZoomComponent.js'],
		['cs', 'IgeTiledComponent', 'components/IgeTiledComponent.js'],
		/* Physics Libraries */
		['cs', 'Box2D', 'components/physics/box2d/lib_box2d.js', 'Box2D'],
		['cs', 'Cannon', 'components/physics/cannon/lib_cannon.js'],
		['cs', 'IgeCannonComponent', 'components/physics/cannon/IgeCannonComponent.js'],
		['cs', 'IgeTimeSyncExtension', 'components/network/IgeTimeSyncExtension.js'],
		/* Socket.io */
		['c', 'io', 'components/network/socket.io/client/socket.io.min.js'],
		['c', 'IgeSocketIoClient', 'components/network/socket.io/IgeSocketIoClient.js'],
		['s', 'IgeSocketIoServer', 'components/network/socket.io/IgeSocketIoServer.js'],
		['cs', 'IgeSocketIoComponent', 'components/network/socket.io/IgeSocketIoComponent.js'],
		/* Net.io */
		['c', 'NetIo', 'components/network/net.io/net.io-client/index.js'],
		['c', 'IgeNetIoClient', 'components/network/net.io/IgeNetIoClient.js'],
		['s', 'IgeNetIoServer', 'components/network/net.io/IgeNetIoServer.js'],
		['cs', 'IgeNetIoComponent', 'components/network/net.io/IgeNetIoComponent.js'],
		/* Network Stream */
		['cs', 'IgeStreamComponent', 'components/network/stream/IgeStreamComponent.js'],
		['cs', 'IgeStreamExtension', 'extensions/IgeStreamExtension.js'],
		/* Chat System */
		['c', 'IgeChatClient', 'components/chat/IgeChatClient.js'],
		['s', 'IgeChatServer', 'components/chat/IgeChatServer.js'],
		['cs', 'IgeChatComponent', 'components/chat/IgeChatComponent.js'],
		/* MySQL Support */
		['s', 'IgeMySql', 'components/database/mysql/IgeMySql.js'],
		['s', 'IgeMySqlComponent', 'components/database/mysql/IgeMySqlComponent.js'],
		/* MongoDB Support */
		['s', 'IgeMongoDb', 'components/database/mongodb/IgeMongoDb.js'],
		['s', 'IgeMongoDbComponent', 'components/database/mongodb/IgeMongoDbComponent.js'],
		/* CocoonJS Support */
		['cs', 'IgeCocoonJsComponent', 'components/cocoonjs/IgeCocoonJsComponent.js'],
		/* General Extensions */
		['cs', 'IgeTransformExtension', 'extensions/IgeTransformExtension.js'],
		['cs', 'IgeUiPositionExtension', 'extensions/IgeUiPositionExtension.js'],
		['cs', 'IgeUiStyleExtension', 'extensions/IgeUiStyleExtension.js'],
		['cs', 'IgeUiInteractionExtension', 'extensions/IgeUiInteractionExtension.js'],
		['cs', 'IgeInterpolatorExtension', 'extensions/IgeInterpolatorExtension.js'],
		/* Main Engine Classes */
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
		['cs', 'IgeBox2dComponent', 'components/physics/box2d/IgeBox2dComponent.js'],
		['cs', 'IgeEntityBox2d', 'components/physics/box2d/IgeEntityBox2d.js'],
		['cs', 'IgeEntityCannon', 'components/physics/cannon/IgeEntityCannon.js'],
		/* UI Classes */
		['cs', 'IgeUiButton', 'ui/IgeUiButton.js'],
		['cs', 'IgeUiRadioButton', 'ui/IgeUiRadioButton.js'],
		['cs', 'IgeUiProgressBar', 'ui/IgeUiProgressBar.js'],
		['cs', 'IgeUiTextBox', 'ui/IgeUiTextBox.js'],
		['cs', 'IgeUiMenu', 'ui/IgeUiMenu.js'],
		/* Image Filters */
		['c', 'IgeFilters', 'core/IgeFilters.js'],
		['c', 'IgeFilters.convolute', 'filters/convolute.js'],
		['c', 'IgeFilters.greyScale', 'filters/greyScale.js'],
		['c', 'IgeFilters.brighten', 'filters/brighten.js'],
		['c', 'IgeFilters.threshold', 'filters/threshold.js'],
		['c', 'IgeFilters.sharpen', 'filters/sharpen.js'],
		['c', 'IgeFilters.blur', 'filters/blur.js'],
		['c', 'IgeFilters.emboss', 'filters/emboss.js'],
		/* Engine Actual */
		['cs', 'IgeEngine', 'core/IgeEngine.js']
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeCoreConfig; }