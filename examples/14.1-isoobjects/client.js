var Client = IgeClass.extend({
	classId: 'Client',
	init: function () {
		ige.showStats(1);

		// Load our textures
		var self = this,
			gameTexture = [],
			Player, x;

		this.obj = [];

		gameTexture[0] = new IgeTexture('../assets/textures/buildings/bank1.png');
		
		ige.addComponent(IgeEditorComponent);

		// Wait for our textures to load before continuing
		ige.on('texturesLoaded', function () {
			// Create the HTML canvas
			ige.createFrontBuffer(true);

			ige.start(function (success) {
				// Check if the engine started successfully
				if (success) {
					// Create the scene
					self.scene1 = new IgeScene2d()
						.id('scene1');

					// Create the main viewport
					self.vp1 = new IgeViewport()
						.id('vp1')
						.autoSize(true)
						.scene(self.scene1)
						.drawBounds(true)
						.drawBoundsData(true)
						.mount(ige);
						//.camera.translateTo(-50, 30, 0);

					// Create the tile map
					self.tileMap1 = new IgeTileMap2d()
						.tileWidth(40)
						.tileHeight(40)
						.drawGrid(0)
						.drawBounds(false)
						.drawBoundsData(false)
						.isometricMounts(true)
						.mount(self.scene1);
					
					var overArr = [];
					
					var mouseOverFunc = function () {
						overArr.pushUnique(this);
					};
					
					var mouseOutFunc = function () {
						overArr.pull(this);
						
						// Turn off highlight since we've moved off the entity
						this.highlight(false);
					};
					
					var cuboidHighlighterByDistance = function () {
						// Loop each item the mouse is over and determine distance from center
						var count = overArr.length,
							item,
							mousePos,
							dist,
							lowestDist,
							closestEntity;
						
						while (count--) {
							item = overArr[count];
							
							// Turn off highlight for the entity
							item.highlight(false);
							
							// Get the local entity mouse position
							mousePos = item.mousePos();
							
							// Calculate distance
							dist = Math.distance(0, 0, mousePos.x, mousePos.y);
							
							// Check if this is the lowest distance
							if (lowestDist === undefined || dist < lowestDist) {
								// Record the new lowest distance
								lowestDist = dist;
								
								// Record the closest entity to the mouse so far
								closestEntity = item;
							}
						}
						
						if (closestEntity) {
							// We have a closest entity!
							closestEntity.highlight(true);
						}
					};
					
					var cuboidHighlighterByDepth = function () {
						// Loop each item the mouse is over and determine depth
						var count = overArr.length,
							item,
							depth,
							highestDepth = 0,
							closestEntity;
						
						while (count--) {
							item = overArr[count];
							
							// Turn off highlight for the entity
							item.highlight(false);
							
							// Get the entity depth
							depth = item.depth();
							
							// Check if this is the highest depth so far
							if (depth >= highestDepth) {
								// Record the new lowest distance
								highestDepth = depth;
								
								// Record the closest entity to the mouse so far
								closestEntity = item;
							}
						}
						
						if (closestEntity) {
							// We have a closest entity!
							closestEntity.highlight(true);
						}
					};
					
					// We are going to use the cuboidHighlighterByDepth but you can swap
					// that out for cuboidHighlighterByDistance to see picking by distance
					// from the entity center to the mouse pointer
					ige.addBehaviour('cuboidHighlighter', cuboidHighlighterByDepth, false);

					// Create an entity
					// Plinth 1
					x = -140;
					self.obj[0] = new Cuboid(mouseOverFunc, mouseOutFunc)
						.id(1)
						.depth(0)
						.mount(self.tileMap1)
						.translateTo(x + 0, 0, 0)
						.bounds3d(160, 240, 40);

					self.obj[1] = new Cuboid(mouseOverFunc, mouseOutFunc)
						.id(2)
						.depth(1)
						.mount(self.tileMap1)
						.translateTo(x + 0, -60, 40)
						.bounds3d(40, 40, 40);

					self.obj[2] = new Cuboid(mouseOverFunc, mouseOutFunc)
						.id(3)
						.depth(2)
						.mount(self.tileMap1)
						.translateTo(x + 0, 60, 40)
						.bounds3d(40, 40, 40);

					self.obj[3] = new Cuboid(mouseOverFunc, mouseOutFunc)
						.id(4)
						.depth(4)
						.mount(self.tileMap1)
						.translateTo(x + 0, 0, 80)
						.bounds3d(40, 160, 40);

					// Center column
					self.obj[4] = new Cuboid(mouseOverFunc, mouseOutFunc)
						.id(5)
						.depth(5)
						.mount(self.tileMap1)
						.translateTo(0, 0, 0)
						.bounds3d(40, 380, 120);

					// Plinth 2
					x = 140;
					self.obj[5] = new Cuboid(mouseOverFunc, mouseOutFunc)
						.id(6)
						.depth(6)
						.mount(self.tileMap1)
						.translateTo(x + 0, 0, 0)
						.bounds3d(160, 240, 40);

					self.obj[6] = new Cuboid(mouseOverFunc, mouseOutFunc)
						.id(7)
						.depth(7)
						.mount(self.tileMap1)
						.translateTo(x + 0, -60, 40)
						.bounds3d(40, 40, 40);

					self.obj[7] = new Cuboid(mouseOverFunc, mouseOutFunc)
						.id(8)
						.depth(8)
						.mount(self.tileMap1)
						.translateTo(x + 0, 60, 40)
						.bounds3d(40, 40, 40);

					self.obj[8] = new Cuboid(mouseOverFunc, mouseOutFunc)
						.id(9)
						.depth(9)
						.mount(self.tileMap1)
						.translateTo(x + 0, 0, 80)
						.bounds3d(40, 160, 40);

					// Big slab on top
					self.obj[9] = new Cuboid(mouseOverFunc, mouseOutFunc)
						.id(10)
						.depth(10)
						.mount(self.tileMap1)
						.bounds3d(360, 10, 20)
						.translateTo(0, 0, 120);

					// Building
					self.obj[10] = new Cuboid(mouseOverFunc, mouseOutFunc)
						.id(11)
						.depth(11)
						.mount(self.tileMap1)
						.translateTo(0, 300, 0)
						.bounds3d(80, 80, 40);

					self.obj[11] = new Cuboid(mouseOverFunc, mouseOutFunc)
						.id(12)
						.depth(12)
						.mount(self.tileMap1)
						.translateTo(0, 300, 40)
						.bounds3d(70, 70, 40);

					self.obj[12] = new Cuboid(mouseOverFunc, mouseOutFunc)
						.id(13)
						.depth(13)
						.mount(self.tileMap1)
						.translateTo(0, 300, 80)
						.bounds3d(10, 10, 120);

					self.obj[13] = new Cuboid(mouseOverFunc, mouseOutFunc)
						.id(14)
						.depth(14)
						.mount(self.tileMap1)
						.translateTo(0, 300, 200)
						.bounds3d(200, 200, 10)
						.mouseOver(mouseOverFunc)
						.mouseOut(mouseOutFunc)
						.mouseEventsActive(true)
						.triggerPolygon('bounds3dPolygon');

					self.obj[14] = new Cuboid(mouseOverFunc, mouseOutFunc)
						.addComponent(IgeVelocityComponent)
						.addComponent(PlayerComponent)
						.id(15)
						.depth(15)
						.mount(self.tileMap1)
						.translateTo(300, 300, 0)
						.bounds3d(20, 20, 80);
				}
			});
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }