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
		ray,
		intersect,
		m,
		directionVector,
		rotateZ;

	projector.unprojectVector(vector, camera);
	ray = new THREE.Ray(camera.position, vector.subSelf(camera.position).normalize());
	intersect = ray.intersectObject(ige.$('plane')._threeObj, false);

	if (intersect.length) {
		intersect[0].point.y = -intersect[0].point.y;
		mouseWorld = intersect[0].point;
		m = this._threeObj.matrixWorld.elements;
		directionVector = {x: m[12] - mouseWorld.x, y: -m[13] - (mouseWorld.y)};
		rotateZ = Math.atan2(directionVector.x, directionVector.y);

		this.rotateTo(0, 0, rotateZ - this._parent._rotate.z);
	}
};