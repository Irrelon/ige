var igeCoreConfig = {
	include: [
		/* Client-Side Stack Trace Support */
		['c', 'IgeStackTrace', 'components/stackTrace/lib_stack.js'],
		/* The IGE Core Files */
		['csap', 'IgeBase', 'core/IgeBase.js'],
		['csap', 'IgeClass', 'core/IgeClass.js'],
		['csap', 'IgeEventingClass', 'core/IgeEventingClass.js'],
		/* Data Classes */
		['csap', 'IgePoint', 'core/IgePoint.js'],
		['csap', 'IgePoly2d', 'core/IgePoly2d.js'],
		['csap', 'IgeRect', 'core/IgeRect.js'],
		['csap', 'IgeMatrix2d', 'core/IgeMatrix2d.js'],
		/* Components */
		['csap', 'IgeAnimationComponent', 'components/IgeAnimationComponent.js'],
		['csap', 'IgeVelocityComponent', 'components/IgeVelocityComponent.js'],
		['csap', 'IgeTweenComponent', 'components/IgeTweenComponent.js'],
		['csap', 'IgePathComponent', 'components/IgePathComponent.js'],
		['csap', 'IgeInputComponent', 'components/IgeInputComponent.js'],
		['csap', 'IgeMousePanComponent', 'components/IgeMousePanComponent.js'],
		['csap', 'IgeMouseZoomComponent', 'components/IgeMouseZoomComponent.js'],
		['csap', 'IgeTiledComponent', 'components/IgeTiledComponent.js'],
		['csap', 'IgeUiManagerComponent', 'components/IgeUiManagerComponent.js'],
		['csap', 'IgeEntityManager', 'components/entityManager/IgeEntityManager.js'],
		['csap', 'IgeEntityManagerComponent', 'components/IgeEntityManagerComponent.js'],
		['csap', 'IgeEditorComponent', 'components/editor/IgeEditorComponent.js'],
		['csap', 'IgeEditorPanelsComponent', 'components/editor/panels/IgeEditorPanelsComponent.js'],
		['csap', 'IgeEditorTranslateComponent', 'components/editor/IgeEditorTranslateComponent.js'],
		['csap', 'IgeEditorRotateComponent', 'components/editor/IgeEditorRotateComponent.js'],
		/* Physics Libraries */
		['csap', 'Box2D', 'components/physics/box2d/lib_box2d.js', 'Box2D'],
		['csap', 'Cannon', 'components/physics/cannon/lib_cannon.js'],
		['csap', 'IgeCannonComponent', 'components/physics/cannon/IgeCannonComponent.js'],
		/* Network Stream */
		['csap', 'IgeTimeSyncExtension', 'components/network/IgeTimeSyncExtension.js'],
		['csap', 'IgeStreamComponent', 'components/network/stream/IgeStreamComponent.js'],
		/* Socket.io */
		['cap', 'SocketIo', 'components/network/socket.io/client/socket.io.min.js'],
		['cap', 'IgeSocketIoClient', 'components/network/socket.io/IgeSocketIoClient.js'],
		['sap', 'IgeSocketIoServer', 'components/network/socket.io/IgeSocketIoServer.js'],
		['csap', 'IgeSocketIoComponent', 'components/network/socket.io/IgeSocketIoComponent.js'],
		/* Net.io */
		['cap', 'NetIo', 'components/network/net.io/net.io-client/index.js'],
		['cap', 'IgeNetIoClient', 'components/network/net.io/IgeNetIoClient.js'],
		['sap', 'IgeNetIoServer', 'components/network/net.io/IgeNetIoServer.js'],
		['csap', 'IgeNetIoComponent', 'components/network/net.io/IgeNetIoComponent.js'],
		/* Chat System */
		['cap', 'IgeChatClient', 'components/chat/IgeChatClient.js'],
		['sap', 'IgeChatServer', 'components/chat/IgeChatServer.js'],
		['csap', 'IgeChatComponent', 'components/chat/IgeChatComponent.js'],
		/* MySQL Support */
		['sap', 'IgeMySql', 'components/database/mysql/IgeMySql.js'],
		['sap', 'IgeMySqlComponent', 'components/database/mysql/IgeMySqlComponent.js'],
		/* MongoDB Support */
		['sap', 'IgeMongoDb', 'components/database/mongodb/IgeMongoDb.js'],
		['sap', 'IgeMongoDbComponent', 'components/database/mongodb/IgeMongoDbComponent.js'],
		/* CocoonJS Support */
		['csap', 'IgeCocoonJsComponent', 'components/cocoonjs/IgeCocoonJsComponent.js'],
		/* General Extensions */
		['csap', 'IgeUiPositionExtension', 'extensions/IgeUiPositionExtension.js'],
		['csap', 'IgeUiStyleExtension', 'extensions/IgeUiStyleExtension.js'],
		/* Main Engine Classes */
		['csap', 'IgeSceneGraph', 'core/IgeSceneGraph.js'],
		['csap', 'IgeBaseScene', 'core/IgeBaseScene.js'],
		['csap', 'IgeDummyCanvas', 'core/IgeDummyCanvas.js'],
		['csap', 'IgeDummyContext', 'core/IgeDummyContext.js'],
		['csap', 'IgePathNode', 'core/IgePathNode.js'],
		['csap', 'IgePathFinder', 'core/IgePathFinder.js'],
		['csap', 'IgeTween', 'core/IgeTween.js'],
		['csap', 'IgeTexture', 'core/IgeTexture.js'],
		['csap', 'IgeCellSheet', 'core/IgeCellSheet.js'],
		['csap', 'IgeSpriteSheet', 'core/IgeSpriteSheet.js'],
		['csap', 'IgeFontSheet', 'core/IgeFontSheet.js'],
		['csap', 'IgeFontSmartTexture', 'assets/IgeFontSmartTexture.js'],
		['csap', 'IgeObject', 'core/IgeObject.js'],
		['csap', 'IgeEntity', 'core/IgeEntity.js'],
		['csap', 'IgeUiEntity', 'core/IgeUiEntity.js'],
		['csap', 'IgeUiElement', 'core/IgeUiElement.js'],
		['csap', 'IgeFontEntity', 'core/IgeFontEntity.js'],
		['csap', 'IgeParticleEmitter', 'core/IgeParticleEmitter.js'],
		['csap', 'IgeMap2d', 'core/IgeMap2d.js'],
		['csap', 'IgeMapStack2d', 'core/IgeMapStack2d.js'],
		['csap', 'IgeTileMap2d', 'core/IgeTileMap2d.js'],
		['csap', 'IgeTextureMap', 'core/IgeTextureMap.js'],
		['csap', 'IgeCollisionMap2d', 'core/IgeCollisionMap2d.js'],
		['csap', 'IgeCamera', 'core/IgeCamera.js'],
		['csap', 'IgeViewport', 'core/IgeViewport.js'],
		['csap', 'IgeScene2d', 'core/IgeScene2d.js'],
		['csap', 'IgeQuest', 'core/IgeQuest.js'],
		['csap', 'IgeCuboidSmartTexture', 'assets/IgeCuboidSmartTexture.js'],
		['csap', 'IgeCuboid', 'primitives/IgeCuboid.js'],
		/* Physics to Entity Components */
		['csap', 'IgeBox2dComponent', 'components/physics/box2d/IgeBox2dComponent.js'],
		['csap', 'IgeEntityBox2d', 'components/physics/box2d/IgeEntityBox2d.js'],
		['csap', 'IgeEntityCannon', 'components/physics/cannon/IgeEntityCannon.js'],
		/* UI Classes */
		['csap', 'IgeUiButton', 'ui/IgeUiButton.js'],
		['csap', 'IgeUiRadioButton', 'ui/IgeUiRadioButton.js'],
		['csap', 'IgeUiProgressBar', 'ui/IgeUiProgressBar.js'],
		['csap', 'IgeUiTextBox', 'ui/IgeUiTextBox.js'],
		['csap', 'IgeUiLabel', 'ui/IgeUiLabel.js'],
		['csap', 'IgeUiTooltip', 'ui/IgeUiTooltip.js'],
		['csap', 'IgeUiMenu', 'ui/IgeUiMenu.js'],
		['csap', 'IgeUiTimeStream', 'ui/IgeUiTimeStream.js'],
		/* Image Filters */
		['cap', 'IgeFilters', 'core/IgeFilters.js'],
		['cap', 'IgeFilters._convolute', 'filters/convolute.js'],
		['cap', 'IgeFilters.greyScale', 'filters/greyScale.js'],
		['cap', 'IgeFilters.brighten', 'filters/brighten.js'],
		['cap', 'IgeFilters.threshold', 'filters/threshold.js'],
		['cap', 'IgeFilters.sharpen', 'filters/sharpen.js'],
		['cap', 'IgeFilters.blur', 'filters/blur.js'],
		['cap', 'IgeFilters.emboss', 'filters/emboss.js'],
		['cap', 'IgeFilters.edgeDetect', 'filters/edgeDetect.js'],
		['cap', 'IgeFilters.edgeEnhance', 'filters/edgeEnhance.js'],
		['cap', 'IgeFilters.outlineDetect', 'filters/outlineDetect.js'],
		['cap', 'IgeFilters.colorOverlay', 'filters/colorOverlay.js'],
		['cap', 'IgeFilters.sobel', 'filters/sobel.js'],
		['cap', 'IgeFilters.invert', 'filters/invert.js'],
		['cap', 'IgeFilters.glowMask', 'filters/glowMask.js'],
		/* WebGL */
		['cap', 'THREE', 'components/three/three.min.js'],
		['cap', 'IgeThree', 'components/three/IgeThree.js'],
		/* Engine Actual */
		['csap', 'IgeEngine', 'core/IgeEngine.js']
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeCoreConfig; }