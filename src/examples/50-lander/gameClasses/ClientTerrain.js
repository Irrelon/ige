var ClientTerrain = {
	createTerrain: function () {
		var i,
			preVal,
			terrainPoly,
			landingPad,
			fixtureArr;

		this.landingPads = [];

		// Create random terrain
		while (!this.landingPadPositions || !this.orbPositions || this.landingPadPositions.length < 1 || this.orbPositions.length < 3) {
			this.landingPadPositions = [];
			this.orbPositions = [];
			this.terrain = [];

			terrainPoly = new IgePoly2d();
			terrainPoly.addPoint(0, 20);

			for (i = 0; i < 40; i++) {
				preVal = Math.random() * 100;
				this.terrain[i] = Math.floor(Math.random() * 20);

				if (preVal > 90 && i > 1) {
					if (this.terrain[i] * 20 < 160) {
						this.terrain[i + 1] = this.terrain[i];
						this.landingPadPositions.push(
							[(i) * 4 * 20 + 40, (this.terrain[i] * 20) - 2, 0]
						);

						terrainPoly.addPoint(i * 4, this.terrain[i]);
						terrainPoly.addPoint((i + 1) * 4, this.terrain[i]);

						i++;
					}
				} else {
					terrainPoly.addPoint(i * 4, this.terrain[i]);

					if (preVal > 50) {
						if (this.terrain[i] * 20 > 200 && i > 2 && i < 39) {
							this.orbPositions.push(
								[(i) * 4 * 20, (this.terrain[i] * 20) - 20, 0]
							);
						}
					}
				}
			}

			terrainPoly.addPoint(i * 4, 20);
		}

		// Loop the landing pads and mount them to the scene
		for (i = 0; i < this.landingPadPositions.length; i++) {
			landingPad = new LandingPad()
				.translateTo(this.landingPadPositions[i][0], this.landingPadPositions[i][1], 0)
				.mount(ige.client.objectScene);

			this.landingPads.push(landingPad);
		}

		// Loop orb positions and mount them
		for (i = 0; i < this.orbPositions.length; i++) {
			new Orb()
				.translateTo(this.orbPositions[i][0], this.orbPositions[i][1], 0)
				.scoreValue(Math.floor(this.orbPositions[i][1] / 4))
				.mount(ige.client.objectScene);
		}

		terrainPoly.multiply(20);
		this.terrainPoly = terrainPoly;

		// Clone the terrain and scale down to box2d level
		this.terrainTriangles = this.terrainPoly.clone();
		this.terrainTriangles.divide(ige.box2d._scaleRatio);

		// Turn the terrain into triangles (box2d only allows convex shapes)
		this.terrainTriangles = this.terrainTriangles.triangulate();

		// Loop the triangles and make fixtures for them
		fixtureArr = [];

		for (i = 0; i < this.terrainTriangles.length; i++) {
			fixtureArr.push({
				filter: {
					categoryBits: 0x0001,
					maskBits: 0xffff
				},
				shape: {
					type: 'polygon',
					data: this.terrainTriangles[i]
				}
			});
		}

		// Now create a box2d entity
		new IgeEntityBox2d()
			.category('floor')
			.box2dBody({
				type: 'static',
				allowSleep: true,
				fixtures: fixtureArr
			});

		// Create the entity that will render the terrain
		var TerrainEntity = IgeEntity.extend({
			classId: 'TerrainEntity',
			tick: function (ctx) {
				IgeEntity.prototype.tick.call(this, ctx);
				ctx.strokeStyle = '#ffffff';
				ige.client.terrainPoly.render(ctx);
			}
		});

		new TerrainEntity()
			.mount(ige.client.mainScene);
	}
};