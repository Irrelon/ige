var IgeThree = IgeEventingClass.extend({
	classId: 'IgeThree',
	componentId: 'three',

	init: function (entity, options) {
		this._entity = entity;
		this._options = options;

		// Override a number of prototypes to inject Three-based
		// processing code into them instead of their standard 2d
		// or isometric processing
		IgeEngine.prototype._frontBufferSetup = this.IgeEngine_frontBufferSetup;
		IgeEntity.prototype._transformContext = this.IgeEntity_transformContext;
		IgeEntity.prototype._renderEntity = this.IgeEntity_renderEntity;
		IgeEntity.prototype.mesh = this.IgeEntity_mesh;
	},

	IgeEngine_frontBufferSetup: function (autoSize, dontScale) {
		// Run the IGE in "headless" mode and allow Three.js to handle
		// all rendering instead
		var i, il,
			self = this;

		/*this._threeCamera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, -2000, 10000 );
		this._threeCamera.position.x = 0;
		this._threeCamera.position.y = 0;
		this._threeCamera.position.z = 500;
		this._threeCamera.rotation.x = 45 * Math.PI / 180;
		this._threeCamera.rotation.y = 35 * Math.PI / 180;
		this._threeCamera.rotation.z = 30 * Math.PI / 180;*/

		this._threeCamera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, -2000, 10000 );
		this._threeCamera.position.x = 0;
		this._threeCamera.position.y = 0;
		this._threeCamera.position.z = 0;
		/*this._threeCamera.rotation.x = 45 * Math.PI / 180;
		this._threeCamera.rotation.y = 35 * Math.PI / 180;
		this._threeCamera.rotation.z = 30 * Math.PI / 180;*/

		this._threeScene = new THREE.Scene();

		var ambient = new THREE.AmbientLight( 0x242424 );
		this._threeScene.add( ambient );

		var SHADOW_MAP_WIDTH = 2048, SHADOW_MAP_HEIGHT = 2048;
		var light = new THREE.SpotLight( 0xd6e2ff, 1, 0, Math.PI, 1 );
		light.position.set( 600, 400, 1000 );
		light.target.position.set( 0, 0, 0 );

		light.castShadow = true;
		light.shadowCameraNear = 200;
		light.shadowCameraFar = 1800;
		light.shadowCameraFov = 45;
		//light.shadowCameraVisible = true;

		light.shadowBias = 0.0005;
		light.shadowDarkness = 0.55;

		light.shadowMapWidth = SHADOW_MAP_WIDTH;
		light.shadowMapHeight = SHADOW_MAP_HEIGHT;
		light.shadowMapSoft = true;
		this._threeScene.add( light );

		var specLight = new THREE.PointLight( 0x058ee4, 0.2, 0, Math.PI, 1 );
		////flameLight.position.set( 600, 400, 1000 );
		//specLight.target.position.set( 0, 0, 0 );
		this._threeScene.add(specLight);

		var geometry = new THREE.CubeGeometry( 100, 100, 100),
			//material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: false })
			texture = THREE.ImageUtils.loadTexture('../assets/textures/particles/star1.png'),
			material = new THREE.MeshBasicMaterial({map: texture, wireframe: false}),
			mesh1 = new THREE.Mesh( geometry, material );

		geometry.dynamic = true;

		for (i = 0, il = geometry.vertices.length; i < il; i++) {
			geometry.vertices[i].y += -100;
		}

		//material.envMap = textureCube;
		material.combine = THREE.MixOperation;
		material.reflectivity = 0.55;
		material.opacity = 1;

		mesh1.position.z = 50;
		//this._threeScene.add( mesh1 );

		var geometry = new THREE.PlaneGeometry(500, 500),
			//material = new THREE.MeshBasicMaterial( { color: 0x0000ff, wireframe: false }),
			texture = THREE.ImageUtils.loadTexture('../assets/textures/backgrounds/greyGradient.png'),
			material = new THREE.MeshBasicMaterial({map: texture, wireframe: false}),
			mesh2 = new THREE.Mesh( geometry, material );

		mesh2.position.z = 0;
		//this._threeScene.add( mesh2 );

		this._threeLoader = new THREE.JSONLoader();

		this._threeLoader.load("../../engine/components/three/fan.js", function(geometry) {
			var fan = new THREE.Mesh( geometry, new THREE.MeshPhongMaterial({color:0xa1592f,shininess:10000,specular:10}) );
			fan.position.set( 156.3,-92.3, 150.3);
			fan.receiveShadow =true;
			fan.castShadow = true;
			//self._threeScene.add(fan);
		});

		this._threeRenderer = new THREE.WebGLRenderer({antialias: false});
		this._threeRenderer.setSize(window.innerWidth, window.innerHeight);
		this._threeRenderer.autoClear = false;
		this._threeRenderer.shadowMapEnabled = true;
		this._threeRenderer.shadowMapSoft = true;

		// Add canvas element to DOM
		document.body.appendChild(this._threeRenderer.domElement);

		self._camX = 45;
		self._camY = 35;
		self._camZ = 30;

		/*var renderModel = new THREE.RenderPass( this._threeScene, this._threeCamera );
		var effectBloom = new THREE.BloomPass( .9 );
		var effectVignette = new THREE.ShaderPass(THREE.ShaderExtras["colorCorrection"]);
		var effectFilm = new THREE.FilmPass( .3, .3,1024,false );
		var effectFXAA = new THREE.ShaderPass( THREE.ShaderExtras[ "sepia" ] );

		effectFilm.renderToScreen = true;
		this._threeComposer = new THREE.EffectComposer( this._threeRenderer );
		this._threeComposer.addPass( renderModel );
		//composer.addPass( effectFocus );
		//composer.addPass( effectFXAA );
		this._threeComposer.addPass( effectBloom );
		this._threeComposer.addPass( effectVignette );
		this._threeComposer.addPass( effectFilm );*/

		this._postTick.push(function () {
			//mesh.rotation.x += 0.01;
			//mesh.rotation.y += 0.02;
			self._camX += 0.1 * ige.tickDelta;
			self._camY -= 0.1 * ige.tickDelta;
			self._camZ -= 0.1 * ige.tickDelta;
			//ige._threeCamera.target.position.copy( mesh1.position );
			//ige._threeCamera.lookAt(mesh1.position);

			//ige._threeCamera.rotation.x = self._camX * Math.PI / 180;
			//ige._threeCamera.rotation.y = self._camY * Math.PI / 180;
			//ige._threeCamera.rotation.z = self._camZ * Math.PI / 180;

			ige._threeRenderer.clear();

			//ige._threeRenderer.setViewport(10, 10, 400, 200);
			//ige._threeRenderer.render( ige._threeScene, ige._threeCamera );

			//ige._threeRenderer.setViewport(400, 10, 400, 200);
			ige._threeRenderer.render( ige._threeScene, ige._threeCamera );
			//ige._threeComposer.render(0.1);
		});
	},

	IgeEntity_transformContext: function (ctx) {

	},

	IgeEntity_renderEntity: function (ctx, dontTransform) {
		var m = this._mesh;
		if (m) {
			// Update the translate, rotate and scale of the mesh
			m.position.x = this._translate.x;
			m.position.y = this._translate.y;
			m.position.z = this._translate.z;

			m.rotation.x = this._rotate.x;
			m.rotation.y = this._rotate.y;
			m.rotation.z = this._rotate.z;

			m.scale.x = this._scale.x;
			m.scale.y = this._scale.y;
			m.scale.z = this._scale.z;
		}
	},

	IgeEntity_mesh: function (mesh) {
		if (mesh !== undefined) {
			if (typeof(mesh) === 'string') {
				var self = this;
				this._meshUrl = mesh;

				// Load a url-based model
				ige._threeLoader.load(mesh, function (geometry) {
					self._mesh = new THREE.Mesh(
						geometry,
						new THREE.MeshPhongMaterial({
							color: 0xa1592f,
							shininess: 10000,
							specular: 10
						})
					);
					self._mesh.receiveShadow = true;
					self._mesh.castShadow = true;

					self._mesh.position.x = self._translate.x;
					self._mesh.position.y = self._translate.y;
					self._mesh.position.z = self._translate.z;

					ige._threeScene.add(self._mesh);
				});
			} else {
				this._mesh = mesh;
			}
			return this;
		}

		return this._mesh;
	}
});