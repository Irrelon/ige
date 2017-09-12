module.exports = {
	/* Includes for the main IGE loader. Flags are indicated as:
	 * c = client
	 * s = server
	 * a =
	 * p = prototype
	 */
	include: [
		/* Client-Side Stack Trace Support */
		['cs', 'IgeStackTrace', 'components/stackTrace/lib_stack.js'],
		
		/* The IGE Core Files */
		['cs', 'IgeBase', 'core/IgeBase.js'],
		['cs', '$ige', 'core/$ige.js'],
		['cs', '$game', 'core/$game.js'],
		['cs', '$time', 'core/$time.js'],
		['cs', '$textures', 'core/$textures.js'],
		['cs', 'IgeClass', 'core/IgeClass.js'],
		['cs', 'IgeEventingClass', 'core/IgeEventingClass.js'],
		
		/* Data Classes */
		['cs', 'IgePoint2d', 'core/IgePoint2d.js'],
		['cs', 'IgePoint3d', 'core/IgePoint3d.js'],
		['cs', 'IgePoly2d', 'core/IgePoly2d.js'],
		['cs', 'IgeRect', 'core/IgeRect.js'],
		['cs', 'IgeMatrix2d', 'core/IgeMatrix2d.js'],
		
		/* Components */
		['cs', 'IgeTimeComponent', 'components/IgeTimeComponent.js'],
		['cs', 'IgeAnimationComponent', 'components/IgeAnimationComponent.js'],
		['cs', 'IgeVelocityComponent', 'components/IgeVelocityComponent.js'],
		['cs', 'IgeTweenComponent', 'components/IgeTweenComponent.js'],
		['cs', 'IgePathComponent', 'components/IgePathComponent.js'],
		['cs', 'IgeInputComponent', 'components/IgeInputComponent.js'],
		['cs', 'IgeGamePadComponent', 'components/IgeGamePadComponent.js'],
		['cs', 'IgeMousePanComponent', 'components/IgeMousePanComponent.js'],
		['cs', 'IgeMouseZoomComponent', 'components/IgeMouseZoomComponent.js'],
		['cs', 'IgeTiledComponent', 'components/IgeTiledComponent.js'],
		['cs', 'IgeUiManagerComponent', 'components/IgeUiManagerComponent.js'],
		['cs', 'IgeEntityManager', 'components/entityManager/IgeEntityManager.js'],
		['cs', 'IgeEntityManagerComponent', 'components/IgeEntityManagerComponent.js'],
		['cs', 'IgeEditorComponent', 'components/editor/IgeEditorComponent.js'],
		['cs', 'IgeEditorTranslateComponent', 'components/editor/IgeEditorTranslateComponent.js'],
		['cs', 'IgeEditorRotateComponent', 'components/editor/IgeEditorRotateComponent.js'],
		
		/* Physics Libraries */
		['cs', 'Box2D', 'components/physics/box2d/lib_box2d.js', 'Box2D'],
		['cs', 'Cannon', 'components/physics/cannon/lib_cannon.js'],
		['cs', 'IgeCannonComponent', 'components/physics/cannon/IgeCannonComponent.js'],
		
		/* Network Stream */
		['cs', 'IgeTimeSyncExtension', 'components/network/IgeTimeSyncExtension.js'],
		['cs', 'IgeStreamComponent', 'components/network/stream/IgeStreamComponent.js'],
		
		/* Socket.io */
		['c', 'SocketIo', 'components/network/socket.io/client/socket.io.min.js'],
		['c', 'IgeSocketIoClient', 'components/network/socket.io/IgeSocketIoClient.js'],
		['s', 'IgeSocketIoServer', 'components/network/socket.io/IgeSocketIoServer.js'],
		['cs', 'IgeSocketIoComponent', 'components/network/socket.io/IgeSocketIoComponent.js'],
		
		/* Net.io */
		['c', 'NetIo', 'components/network/net.io/net.io-client/index.js'],
		['c', 'IgeNetIoClient', 'components/network/net.io/IgeNetIoClient.js'],
		['c', 'IgeNetIoComponent', 'components/network/net.io/IgeNetIoClientComponent.js'],
		['s', 'IgeNetIoServer', 'components/network/net.io/IgeNetIoServer.js'],
		['s', 'IgeNetIoComponent', 'components/network/net.io/IgeNetIoServerComponent.js'],
		
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
		['cs', 'IgeUiPositionExtension', 'extensions/IgeUiPositionExtension.js'],
		['cs', 'IgeUiStyleExtension', 'extensions/IgeUiStyleExtension.js'],
		
		/* Main Engine Classes */
		['cs', '$requestAnimFrame', 'core/$requestAnimFrame.js'],
		['cs', 'IgeFSM', 'core/IgeFSM.js'],
		['cs', 'IgeSceneGraph', 'core/IgeSceneGraph.js'],
		['cs', 'IgeBaseScene', 'core/IgeBaseScene.js'],
		['cs', 'IgeDummyCanvas', 'core/IgeDummyCanvas.js'],
		['cs', 'IgeDummyContext', 'core/IgeDummyContext.js'],
		['cs', 'IgePathNode', 'core/IgePathNode.js'],
		['cs', 'IgePathFinder', 'core/IgePathFinder.js'],
		['cs', 'IgeTween', 'core/IgeTween.js'],
		['cs', 'IgeTexture', 'core/IgeTexture.js'],
		['cs', 'IgeCellSheet', 'core/IgeCellSheet.js'],
		['cs', 'IgeSpriteSheet', 'core/IgeSpriteSheet.js'],
		['cs', 'IgeFontSheet', 'core/IgeFontSheet.js'],
		['cs', 'IgeFontSmartTexture', 'assets/IgeFontSmartTexture.js'],
		['cs', 'IgeObject', 'core/IgeObject.js'],
		['cs', 'IgeEntity', 'core/IgeEntity.js'],
		['cs', 'IgeUiEntity', 'core/IgeUiEntity.js'],
		['cs', 'IgeUiElement', 'core/IgeUiElement.js'],
		['cs', 'IgeFontEntity', 'core/IgeFontEntity.js'],
		['cs', 'IgeParticleEmitter', 'core/IgeParticleEmitter.js'],
		['cs', 'IgeParticle', 'core/IgeParticle.js'],
		['cs', 'IgeMap2d', 'core/IgeMap2d.js'],
		['cs', 'IgeTileMap2d', 'core/IgeTileMap2d.js'],
		['cs', 'IgeTextureMap', 'core/IgeTextureMap.js'],
		['cs', 'IgeTileMap2dSmartTexture', 'assets/IgeTileMap2dSmartTexture.js'],
		['cs', 'IgeCollisionMap2d', 'core/IgeCollisionMap2d.js'],
		['cs', 'IgeCamera', 'core/IgeCamera.js'],
		['cs', 'IgeViewport', 'core/IgeViewport.js'],
		['cs', 'IgeScene2d', 'core/IgeScene2d.js'],
		['cs', 'IgeQuest', 'core/IgeQuest.js'],
		['cs', 'IgeInterval', 'core/IgeInterval.js'],
		['cs', 'IgeTimeout', 'core/IgeTimeout.js'],
		['cs', 'IgeCuboidSmartTexture', 'assets/IgeCuboidSmartTexture.js'],
		['cs', 'IgeCuboid', 'primitives/IgeCuboid.js'],
		['cs', 'IgeArray', 'core/IgeArray.js'],
		
		/* Audio Components */
		['cs', 'IgeAudioComponent', 'components/audio/IgeAudioComponent.js'],
		['cs', 'IgeAudio', 'components/audio/IgeAudio.js'],
		['cs', 'IgeAudioEntity', 'components/audio/IgeAudioEntity.js'],
		
		/* Physics to Entity Components */
		['cs', 'IgeBox2dComponent', 'components/physics/box2d/IgeBox2dComponent.js'],
		['cs', 'IgeBox2dMultiWorldComponent', 'components/physics/box2d/IgeBox2dMultiWorldComponent.js'],
		['cs', 'IgeBox2dWorld', 'components/physics/box2d/IgeBox2dWorld.js'],
		['cs', 'IgeBox2dDebugPainter', 'components/physics/box2d/IgeBox2dDebugPainter.js'],
		['cs', 'IgeEntityBox2d', 'components/physics/box2d/IgeEntityBox2d.js'],
		['cs', 'IgeEntityCannon', 'components/physics/cannon/IgeEntityCannon.js'],
		
		/* UI Classes */
		['cs', 'IgeUiDropDown', 'ui/IgeUiDropDown.js'],
		['cs', 'IgeUiButton', 'ui/IgeUiButton.js'],
		['cs', 'IgeUiRadioButton', 'ui/IgeUiRadioButton.js'],
		['cs', 'IgeUiProgressBar', 'ui/IgeUiProgressBar.js'],
		['cs', 'IgeUiTextBox', 'ui/IgeUiTextBox.js'],
		['cs', 'IgeUiLabel', 'ui/IgeUiLabel.js'],
		['cs', 'IgeUiTooltip', 'ui/IgeUiTooltip.js'],
		['cs', 'IgeUiMenu', 'ui/IgeUiMenu.js'],
		['cs', 'IgeUiTimeStream', 'ui/IgeUiTimeStream.js'],
		
		/* Image Filters */
		['c', 'IgeFilters', 'core/IgeFilters.js'],
		['c', 'IgeFilters._convolute', 'filters/convolute.js'],
		['c', 'IgeFilters.greyScale', 'filters/greyScale.js'],
		['c', 'IgeFilters.brighten', 'filters/brighten.js'],
		['c', 'IgeFilters.threshold', 'filters/threshold.js'],
		['c', 'IgeFilters.sharpen', 'filters/sharpen.js'],
		['c', 'IgeFilters.blur', 'filters/blur.js'],
		['c', 'IgeFilters.emboss', 'filters/emboss.js'],
		['c', 'IgeFilters.edgeDetect', 'filters/edgeDetect.js'],
		['c', 'IgeFilters.edgeEnhance', 'filters/edgeEnhance.js'],
		['c', 'IgeFilters.outlineDetect', 'filters/outlineDetect.js'],
		['c', 'IgeFilters.colorOverlay', 'filters/colorOverlay.js'],
		['c', 'IgeFilters.sobel', 'filters/sobel.js'],
		['c', 'IgeFilters.invert', 'filters/invert.js'],
		['c', 'IgeFilters.glowMask', 'filters/glowMask.js'],
		
		/* WebGL */
		//['c', 'THREE', 'components/three/three.min.js'],
		//['c', 'IgeThree', 'components/three/IgeThree.js'],
		/* Engine Actual */
		['cs', 'IgeEngine', 'core/IgeEngine.js']
	]
};