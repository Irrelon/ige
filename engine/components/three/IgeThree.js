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
	},

	IgeEngine_frontBufferSetup: function (autoSize, dontScale) {
		// Run the IGE in "headless" mode and allow Three.js to handle
		// all rendering instead

		//this._threeCamera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
		//this._threeCamera.position.z = 1000;

		this._threeCamera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, -2000, 10000 );
		this._threeCamera.position.x = 0;
		this._threeCamera.position.y = 0;
		this._threeCamera.position.z = 0;
		this._threeCamera.rotation.x = 45 * Math.PI / 180;
		this._threeCamera.rotation.y = 35 * Math.PI / 180;
		this._threeCamera.rotation.z = 30 * Math.PI / 180;

		this._threeScene = new THREE.Scene();

		var geometry = new THREE.CubeGeometry( 100, 100, 100),
			material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: false }),
			mesh1 = new THREE.Mesh( geometry, material );

		mesh1.position.z = 50;
		this._threeScene.add( mesh1 );

		var geometry = new THREE.PlaneGeometry( 500, 500, 50),
			material = new THREE.MeshBasicMaterial( { color: 0x0000ff, wireframe: false }),
			mesh2 = new THREE.Mesh( geometry, material );

		mesh2.position.z = 0;
		this._threeScene.add( mesh2 );

		this._threeRenderer = new THREE.WebGLRenderer();
		this._threeRenderer.setSize(window.innerWidth, window.innerHeight);
		this._threeRenderer.autoClear = false;
		document.body.appendChild(this._threeRenderer.domElement);

		this._postTick.push(function () {
			//mesh.rotation.x += 0.01;
			//mesh.rotation.y += 0.02;
			//self._camPosX += 0.1;
			//ige._threeCamera.target.position.copy( mesh1.position );
			//ige._threeCamera.lookAt(mesh1.position);

			ige._threeRenderer.clear();

			ige._threeRenderer.setViewport(10, 10, 400, 200);
			ige._threeRenderer.render( ige._threeScene, ige._threeCamera );

			ige._threeRenderer.setViewport(400, 10, 400, 200);
			ige._threeRenderer.render( ige._threeScene, ige._threeCamera );
		});
	},

	IgeEntity_transformContext: function (ctx) {

	},

	IgeEntity_renderEntity: function (ctx, dontTransform) {

	}
});