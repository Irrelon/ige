/**
 * NVIDIA PhysX 5 (C++, Emscripten WebIDL, physx-js-webidl). Defaults: PGS
 * solver, 4 position and 1 velocity iteration per body.
 */
export async function createPhysX () {
	const PhysX = await (await import("physx-js-webidl")).default();
	const version = PhysX.PHYSICS_VERSION;
	const foundation = PhysX.CreateFoundation(version, new PhysX.PxDefaultAllocator(), new PhysX.PxDefaultErrorCallback());
	const tolerances = new PhysX.PxTolerancesScale();
	const physics = PhysX.CreatePhysics(version, foundation, tolerances);
	PhysX.InitExtensions(physics);

	let scene, material, shapeFlags, filterData;
	let vec, vec2, pose, hit;
	const capsuleUp = new PhysX.PxQuat(0, 0, Math.SQRT1_2, Math.SQRT1_2); // capsules run along X: stand them up

	const shape = (geometry, transform) => {
		const s = physics.createShape(geometry, material, true, shapeFlags);
		s.setSimulationFilterData(filterData);
		if (transform) s.setLocalPose(transform);
		PhysX.destroy(geometry);
		return s;
	};

	const dynamicActor = (x, y, z, s) => {
		vec.x = x; vec.y = y; vec.z = z;
		pose.p = vec;
		const actor = physics.createRigidDynamic(pose);
		actor.attachShape(s);
		PhysX.PxRigidBodyExt.prototype.updateMassAndInertia(actor, 1000);
		scene.addActor(actor);
		return actor;
	};

	return {
		name: "PhysX",
		version: "physx-js-webidl 2.9.1 (PhysX 5.12)",
		createWorld () {
			const desc = new PhysX.PxSceneDesc(tolerances);
			desc.gravity = new PhysX.PxVec3(0, -9.81, 0);
			desc.cpuDispatcher = PhysX.DefaultCpuDispatcherCreate(0);
			desc.filterShader = PhysX.DefaultFilterShader();
			scene = physics.createScene(desc);
			material = physics.createMaterial(0.5, 0.5, 0);
			shapeFlags = new PhysX.PxShapeFlags(PhysX.PxShapeFlagEnum.eSCENE_QUERY_SHAPE | PhysX.PxShapeFlagEnum.eSIMULATION_SHAPE);
			filterData = new PhysX.PxFilterData(1, 1, 0, 0);
			vec = new PhysX.PxVec3(0, 0, 0);
			vec2 = new PhysX.PxVec3(0, 0, 0);
			pose = new PhysX.PxTransform(PhysX.PxIDENTITYEnum.PxIdentity);
			hit = new PhysX.PxRaycastBuffer10();
		},
		addStaticBox (x, y, z, hx, hy, hz) {
			vec.x = x; vec.y = y; vec.z = z;
			pose.p = vec;
			const actor = physics.createRigidStatic(pose);
			actor.attachShape(shape(new PhysX.PxBoxGeometry(hx, hy, hz)));
			scene.addActor(actor);
		},
		addDynamicBox (x, y, z, hx, hy, hz) {
			return dynamicActor(x, y, z, shape(new PhysX.PxBoxGeometry(hx, hy, hz)));
		},
		addCapsule (x, y, z, radius, halfHeight) {
			const local = new PhysX.PxTransform(PhysX.PxIDENTITYEnum.PxIdentity);
			local.q = capsuleUp;
			const actor = dynamicActor(x, y, z, shape(new PhysX.PxCapsuleGeometry(radius, halfHeight), local));
			PhysX.destroy(local);
			const lock = PhysX.PxRigidDynamicLockFlagEnum;
			actor.setRigidDynamicLockFlag(lock.eLOCK_ANGULAR_X, true);
			actor.setRigidDynamicLockFlag(lock.eLOCK_ANGULAR_Y, true);
			actor.setRigidDynamicLockFlag(lock.eLOCK_ANGULAR_Z, true);
			return actor;
		},
		addRagdoll (ox, oy, oz, layout) {
			// PhysX joints already stop the two jointed parts colliding
			const parts = layout.parts.map((p) => dynamicActor(ox + p.x, oy + p.y, oz + p.z, shape(new PhysX.PxBoxGeometry(p.hx, p.hy, p.hz))));
			const frameA = new PhysX.PxTransform(PhysX.PxIDENTITYEnum.PxIdentity);
			const frameB = new PhysX.PxTransform(PhysX.PxIDENTITYEnum.PxIdentity);
			for (const j of layout.joints) {
				const a = layout.parts[j.a], b = layout.parts[j.b];
				vec.x = j.x - a.x; vec.y = j.y - a.y; vec.z = j.z - a.z;
				frameA.p = vec;
				vec2.x = j.x - b.x; vec2.y = j.y - b.y; vec2.z = j.z - b.z;
				frameB.p = vec2;
				PhysX.SphericalJointCreate(physics, parts[j.a], frameA, parts[j.b], frameB);
			}
			PhysX.destroy(frameA);
			PhysX.destroy(frameB);
			return parts;
		},
		setVelocityXZ (actor, vx, vz) {
			const v = actor.getLinearVelocity();
			vec.x = vx; vec.y = v.y; vec.z = vz;
			actor.setLinearVelocity(vec, true);
		},
		position (actor) {
			const p = actor.getGlobalPose().p;
			return { x: p.x, y: p.y, z: p.z };
		},
		step (dt) {
			scene.simulate(dt);
			scene.fetchResults(true);
		},
		raycast (ox, oy, oz, dx, dy, dz, maxDist) {
			vec.x = ox; vec.y = oy; vec.z = oz;
			vec2.x = dx; vec2.y = dy; vec2.z = dz;
			return scene.raycast(vec, vec2, maxDist, hit);
		},
		destroyWorld () {
			scene.release();
		}
	};
}
