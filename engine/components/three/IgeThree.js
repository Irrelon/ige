var IgeThree = IgeEventingClass.extend({
	classId: 'IgeThree',
	componentId: 'three',

	init: function(entity, options) {
		this._entity = entity;
		this._options = options;

		this._loader = new THREE.JSONLoader();
		this._geometryLoader = new THREE.GeometryLoader();

		// Override a number of prototypes to inject Three-based
		// processing code into them instead of their standard 2d
		// or isometric processing
		IgeEngine.prototype._frontBufferSetup = this.IgeEngine_frontBufferSetup;

		// Alter entity methods
		IgeEntity.prototype._transformContext = this.IgeEntity_transformContext;
		IgeEntity.prototype._renderEntity = this.IgeEntity_renderEntity;
		IgeEntity.prototype.material = this.IgeEntity_material;
		IgeEntity.prototype.model = this.IgeEntity_model;
		IgeEntity.prototype.mesh = this.IgeEntity_mesh;
		IgeEntity.prototype._$mount = IgeEntity.prototype.mount;
		IgeEntity.prototype.mount = this.IgeEntity_mount;
		IgeEntity.prototype._$unMount = IgeEntity.prototype.unMount;
		IgeEntity.prototype.unMount = this.IgeEntity_unMount;

		// Alter scene methods
		IgeScene2d.prototype._$init = IgeScene2d.prototype.init;
		IgeScene2d.prototype.init = this.IgeScene2d_init;

		// Alter camera methods
		IgeCamera.prototype._$init = IgeCamera.prototype.init;
		IgeCamera.prototype.init = this.IgeCamera_init;
		IgeCamera.prototype.tick = this.IgeCamera_tick;

		// Alter viewport methods
		IgeViewport.prototype.tick = this.IgeViewport_tick;
	},

	IgeCamera_init: function(entity) {
		this._$init(entity);
		this._threeObj = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 10000);
	},

	IgeCamera_tick: function(ctx) {
		// Check if we are tracking the translate value of a target

		if (this._trackTranslateTarget) {
			var targetEntity = this._trackTranslateTarget,
				//targetMatrix = targetEntity._worldMatrix.matrix,
				targetX = targetEntity._translate.x,//targetMatrix[2],
				targetY =  targetEntity._translate.y,//targetMatrix[5],
				sourceX, sourceY, distX, distY;

			if (!this._trackTranslateSmoothing) {
				// Copy the target's world matrix translate data
				this.lookAt(this._trackTranslateTarget);
			} else {
				// Ease between the current and target values
				sourceX = this._translate.x;
				sourceY = this._translate.y;

				distX = targetX - sourceX;
				distY = targetY - sourceY;

				this._translate.x += distX / this._trackTranslateSmoothing;
				this._translate.y += distY / this._trackTranslateSmoothing;
			}
		}

		// Check if we are tracking the rotation values of a target
		if (this._trackRotateTarget) {
			var targetParentRZ = this._trackRotateTarget._parent !== undefined ? this._trackRotateTarget._parent._rotate.z : 0,
				targetZ = -(targetParentRZ + this._trackRotateTarget._rotate.z),
				sourceZ, distZ;

			if (!this._trackRotateSmoothing) {
				// Copy the target's rotate data
				this._rotate.z = targetZ;
			} else {
				// Interpolate between the current and target values
				sourceZ = this._rotate.z;
				distZ = targetZ - sourceZ;

				this._rotate.z += distZ / this._trackRotateSmoothing;
			}
		}

		this._threeObj.position.x = this._translate.x;
		this._threeObj.position.y = -this._translate.y;
		this._threeObj.position.z = this._translate.z;

		this._threeObj.rotation.x = this._rotate.x;
		this._threeObj.rotation.y = this._rotate.y;
		this._threeObj.rotation.z = this._rotate.z;

		// Updated local transform matrix and then transform the context
		//this.updateTransform();
		//this._localMatrix.transformRenderingContext(ctx);
	},

	IgeViewport_tick: function(ctx, scene) {
		// Check if we have a scene attached to this viewport
		if (this._scene) {
			// Store the viewport camera in the main ige so that
			// down the scenegraph we can choose to negate the camera
			// transform effects
			ige._currentCamera = this.camera;
			ige._currentViewport = this;

			this._scene._parent = this;

			// Process child ticks
			IgeEntity.prototype.tick.apply(this, [ctx]);

			// Process the camera's tick method
			this.camera.tick(ctx);

			// Process scene's child ticks
			this._scene.tick(ctx, scene);

			// Draw the scene
			ige._threeRenderer.clear();
			ige._threeRenderer.render(this._scene._threeObj, this.camera._threeObj);
		}
	},

	IgeScene2d_init: function(options) {
		this._$init(options);
		this._threeObj = new THREE.Scene();

		var ambient = new THREE.AmbientLight(0x242424);
		this._threeObj.add(ambient);

		var light = new THREE.SpotLight(0xd6e2ff, 1, 0, Math.PI, 1);
		light.position.set(600, 400, 1000);
		light.target.position.set(0, 0, 0);

		light.castShadow = true;
		light.shadowCameraNear = 200;
		light.shadowCameraFar = 1800;
		light.shadowCameraFov = 45;
		//light.shadowCameraVisible = true;

		light.shadowBias = 0.0005;
		light.shadowDarkness = 0.55;

		light.shadowMapWidth = 2048;
		light.shadowMapHeight = 2048;
		light.shadowMapSoft = true;
		this._threeObj.add(light);

		/*var specLight = new THREE.PointLight( 0x058ee4, 0.2, 0, Math.PI, 1 );
		 ////flameLight.position.set( 600, 400, 1000 );
		 //specLight.target.position.set( 0, 0, 0 );
		 this._threeObj.add(specLight);*/
	},

	IgeEngine_frontBufferSetup: function(autoSize, dontScale) {
		// Run the IGE in "headless" mode and allow Three.js to handle
		// all rendering instead
		var i, il,
			self = this;

		//this._threeObj = new THREE.Scene();
		//this._threeObj = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.01, 10000);
		//this._threeObj.position.x = 0;
		//this._threeObj.position.y = 0;
		//this._threeObj.position.z = 200;
		/*this._threeObj.rotation.x = 45 * Math.PI / 180;
		 this._threeObj.rotation.y = 35 * Math.PI / 180;
		 this._threeObj.rotation.z = 30 * Math.PI / 180;*/

		/*this._threeObj = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, -2000, 10000 );
		 this._threeObj.position.x = 0;
		 this._threeObj.position.y = 0;
		 this._threeObj.position.z = 0;*/
		/*this._threeObj.rotation.x = 45 * Math.PI / 180;
		 this._threeObj.rotation.y = 35 * Math.PI / 180;
		 this._threeObj.rotation.z = 30 * Math.PI / 180;*/

		/*var geometry = new THREE.CubeGeometry(1, 1, 1),
		 material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: false }),
		 //texture = THREE.ImageUtils.loadTexture('../assets/textures/particles/star1.png'),
		 //material = new THREE.MeshBasicMaterial({map: texture, wireframe: false}),
		 mesh1 = new THREE.Mesh(geometry, material);

		 geometry.dynamic = true;*/

		/*for (i = 0, il = geometry.vertices.length; i < il; i++) {
		 geometry.vertices[i].y += -100;
		 }*/

		//material.envMap = textureCube;
		//material.combine = THREE.MixOperation;
		//material.reflectivity = 0.55;
		//material.opacity = 1;

		//mesh1.position.z = 0;
		//this._threeObj.add(mesh1);

		/*var geometry = new THREE.PlaneGeometry(500, 500),
		 //material = new THREE.MeshBasicMaterial( { color: 0x0000ff, wireframe: false }),
		 texture = THREE.ImageUtils.loadTexture('../assets/textures/backgrounds/greyGradient.png'),
		 material = new THREE.MeshBasicMaterial({map: texture, wireframe: false}),
		 mesh2 = new THREE.Mesh( geometry, material );

		 mesh2.position.z = 0;
		 //this._threeObj.add( mesh2 );*/
		this._threeRenderer = new THREE.WebGLRenderer({antialias: false});
		this._threeRenderer.setSize(window.innerWidth, window.innerHeight);
		this._threeRenderer.autoClear = false;
		//this._threeRenderer.shadowMapEnabled = true;
		//this._threeRenderer.shadowMapSoft = true;

		// Add canvas element to DOM
		this.three._canvas = this._threeRenderer.domElement;
		document.body.appendChild(this.three._canvas);
		ige._bounds2d = new IgePoint2d(this.three._canvas.width, this.three._canvas.height);

		/*controls = new THREE.TrackballControls(this._threeObj, this._threeRenderer.domElement);
		 controls.rotateSpeed = 0.20;*/

		/*self._camX = 45;
		 self._camY = 35;
		 self._camZ = 30;*/

		/*var renderModel = new THREE.RenderPass( this._threeObj, this._threeObj );
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

		/*this._postTick.push(function () {
		 //ige._threeRenderer.clear();
		 //ige._threeRenderer.render( ige._threeObj, ige._threeObj );

		 //ige._threeRenderer.setViewport(10, 10, 400, 200);
		 //ige._threeRenderer.render( ige._threeObj, ige._threeObj );
		 //ige._threeRenderer.setViewport(400, 10, 400, 200);
		 //ige._threeComposer.render(0.1);
		 });*/
	},

	IgeEntity_transformContext: function(ctx) {

	},

	IgeEntity_renderEntity: function(ctx, dontTransform) {
		var m = this._threeObj;
		if (m) {
			// Update the translate, rotate and scale of the mesh
			if (m.position) {
				m.position.x = this._translate.x;
				m.position.y = -this._translate.y;
				m.position.z = this._translate.z;
			}

			if (m.rotation) {
				m.rotation.x = this._rotate.x;
				m.rotation.y = this._rotate.y;
				m.rotation.z = -this._rotate.z;
			}

			if (m.scale) {
				m.scale.x = this._scale.x;
				m.scale.y = this._scale.y;
				m.scale.z = this._scale.z;
			}
		}
	},

	IgeEntity_material: function(material) {
		if (material !== undefined) {
			this._material = material;
			return this;
		}

		return this._material;
	},

	IgeEntity_model: function(model) {
		if (model !== undefined) {
			ige.three._geometryLoader.path = './models';
			this._threeObj = new THREE.Mesh(
				ige.three._geometryLoader.parse(model),
				this._material || new THREE.MeshFaceMaterial()
			);

			this._threeObj.receiveShadow = true;
			this._threeObj.castShadow = true;
			return this;
		}

		return this._threeObj;
	},

	IgeEntity_mesh: function(mesh) {
		if (mesh !== undefined) {
			this._threeObj = new THREE.Mesh(
				mesh,
				this._material || new THREE.MeshBasicMaterial({color: 0x0000ff, wireframe: true})
			);
			return this;
		}

		return this._threeObj;
	},

	IgeEntity_mount: function(obj) {
		var self = this;

		if (this._threeObj) {
			obj._threeObj.add(this._threeObj);
			this._threeObj._igeEntity = this;
		}

		return this._$mount(obj);
	},

	IgeEntity_unMount: function() {
		var self = this;

		if (this._threeObj) {
			delete this._threeObj._igeEntity;
			this._parent._threeObj.remove(this._threeObj);
		}

		return this._$unMount();
	}
});
