var TurretMouseAim = function () {
	var projector = new THREE.Projector(),
		camera = ige.client.vp1.camera._threeObj,
		mousePoint = ige.mousePos(),
		mouseWorld,
		x = mousePoint.x + (window.innerWidth / 2),
		y = mousePoint.y + (window.innerHeight / 2),
		vector = new THREE.Vector3(
			(x / window.innerWidth) * 2 - 1,
			-(y / window.innerHeight) * 2 + 1,
			0.5
		),
		worldMatrix,
		directionVector,
		rotateZ,
		dir,
		distance;

	projector.unprojectVector( vector, camera );

	dir = vector.subSelf( camera.position ).normalize();
	distance = - camera.position.z / dir.z;
	mouseWorld = camera.position.clone().addSelf( dir.multiplyScalar( distance ) );

	if (mouseWorld) {
		// Invert the y axis
		mouseWorld.y = -mouseWorld.y;

		worldMatrix = this._threeObj.matrixWorld.elements;
		directionVector = {x: worldMatrix[12] - mouseWorld.x, y: -worldMatrix[13] - (mouseWorld.y)};
		rotateZ = -Math.atan2(directionVector.x, directionVector.y);

		this.rotateTo(0, 0, rotateZ - this._parent._rotate.z);
	}
};