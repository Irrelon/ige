/**
 * Jolt (C++, Emscripten WebIDL by Jolt's author). Defaults: 10 velocity and
 * 2 position iterations, 1 collision step per update.
 * @param {"single" | "multi"} threads
 */
export async function createJolt (threads = "single") {
	const init = threads === "multi"
		? (await import("jolt-physics/wasm-compat-multithread")).default
		: threads === "debug"
			? (await import("jolt-physics/debug-wasm-compat")).default
			: (await import("jolt-physics/wasm-compat")).default;
	const Jolt = await init();

	const LAYER_STATIC = 0, LAYER_MOVING = 1, NUM_LAYERS = 2;
	const CONTACTS = Number(new URLSearchParams(location.search).get("joltContacts") || 20000);
	let jolt, system, bodies, query;
	let vec, rvec, quat;
	let ray, raySettings, collector, bpFilter, objFilter, bodyFilter, shapeFilter;
	let ragdollFilter;
	let ragdollCount = 0;

	const createBody = (shape, x, y, z, motion, layer, configure) => {
		rvec.Set(x, y, z);
		const settings = new Jolt.BodyCreationSettings(shape, rvec, quat, motion, layer);
		settings.mFriction = 0.5;
		if (configure) configure(settings);
		const body = bodies.CreateBody(settings);
		Jolt.destroy(settings);
		bodies.AddBody(body.GetID(), Jolt.EActivation_Activate);
		return body;
	};

	return {
		name: threads === "multi" ? "Jolt (threads)" : "Jolt",
		version: "jolt-physics 1.1.1",
		createWorld () {
			const settings = new Jolt.JoltSettings();
			settings.mMaxBodies = 20000;
			settings.mMaxBodyPairs = 65536;
			settings.mMaxContactConstraints = CONTACTS;
			if (threads === "multi") {
				settings.mMaxWorkerThreads = Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 4) - 1));
			}
			const pairs = new Jolt.ObjectLayerPairFilterTable(NUM_LAYERS);
			pairs.EnableCollision(LAYER_STATIC, LAYER_MOVING);
			pairs.EnableCollision(LAYER_MOVING, LAYER_MOVING);
			const bpStatic = new Jolt.BroadPhaseLayer(0), bpMoving = new Jolt.BroadPhaseLayer(1);
			const bpInterface = new Jolt.BroadPhaseLayerInterfaceTable(NUM_LAYERS, 2);
			bpInterface.MapObjectToBroadPhaseLayer(LAYER_STATIC, bpStatic);
			bpInterface.MapObjectToBroadPhaseLayer(LAYER_MOVING, bpMoving);
			settings.mObjectLayerPairFilter = pairs;
			settings.mBroadPhaseLayerInterface = bpInterface;
			settings.mObjectVsBroadPhaseLayerFilter = new Jolt.ObjectVsBroadPhaseLayerFilterTable(bpInterface, 2, pairs, NUM_LAYERS);
			jolt = new Jolt.JoltInterface(settings);
			Jolt.destroy(settings);
			system = jolt.GetPhysicsSystem();
			bodies = system.GetBodyInterface();

			// ?joltIterations=4,1: velocity and position solver iterations
			// closer to the other engines' defaults (Jolt's are 10 and 2)
			const iterations = new URLSearchParams(location.search).get("joltIterations");
			if (iterations) {
				const [velocity, position] = iterations.split(",").map(Number);
				const physicsSettings = system.GetPhysicsSettings();
				physicsSettings.mNumVelocitySteps = velocity;
				physicsSettings.mNumPositionSteps = position;
				system.SetPhysicsSettings(physicsSettings);
			}
			query = system.GetNarrowPhaseQuery();

			vec = new Jolt.Vec3(0, 0, 0);
			rvec = new Jolt.RVec3(0, 0, 0);
			quat = new Jolt.Quat(0, 0, 0, 1);
			ray = new Jolt.RRayCast();
			raySettings = new Jolt.RayCastSettings();
			collector = new Jolt.CastRayClosestHitCollisionCollector();
			bpFilter = new Jolt.DefaultBroadPhaseLayerFilter(jolt.GetObjectVsBroadPhaseLayerFilter(), LAYER_MOVING);
			objFilter = new Jolt.DefaultObjectLayerFilter(jolt.GetObjectLayerPairFilter(), LAYER_MOVING);
			bodyFilter = new Jolt.BodyFilter();
			shapeFilter = new Jolt.ShapeFilter();
			ragdollFilter = null;
			ragdollCount = 0;
		},
		addStaticBox (x, y, z, hx, hy, hz) {
			vec.Set(hx, hy, hz);
			createBody(new Jolt.BoxShape(vec, 0.05, null), x, y, z, Jolt.EMotionType_Static, LAYER_STATIC);
		},
		addDynamicBox (x, y, z, hx, hy, hz) {
			vec.Set(hx, hy, hz);
			return createBody(new Jolt.BoxShape(vec, Math.min(0.05, hx, hy, hz) * 0.5, null), x, y, z, Jolt.EMotionType_Dynamic, LAYER_MOVING);
		},
		addCapsule (x, y, z, radius, halfHeight) {
			return createBody(new Jolt.CapsuleShape(halfHeight, radius, null), x, y, z, Jolt.EMotionType_Dynamic, LAYER_MOVING, (s) => {
				s.mAllowedDOFs = Jolt.EAllowedDOFs_TranslationX | Jolt.EAllowedDOFs_TranslationY | Jolt.EAllowedDOFs_TranslationZ;
			});
		},
		addRagdoll (ox, oy, oz, layout) {
			// Parts don't collide with the part they are jointed to
			if (!ragdollFilter) {
				ragdollFilter = new Jolt.GroupFilterTable(layout.parts.length);
				for (const j of layout.joints) ragdollFilter.DisableCollision(j.a, j.b);
			}
			const group = ragdollCount++;
			const parts = layout.parts.map((p, i) => {
				vec.Set(p.hx, p.hy, p.hz);
				return createBody(new Jolt.BoxShape(vec, Math.min(0.05, p.hx, p.hy, p.hz) * 0.5, null), ox + p.x, oy + p.y, oz + p.z, Jolt.EMotionType_Dynamic, LAYER_MOVING, (s) => {
					s.mCollisionGroup = new Jolt.CollisionGroup(ragdollFilter, group, i);
				});
			});
			for (const j of layout.joints) {
				const c = new Jolt.PointConstraintSettings();
				c.mSpace = Jolt.EConstraintSpace_WorldSpace;
				rvec.Set(ox + j.x, oy + j.y, oz + j.z);
				c.mPoint1 = rvec;
				c.mPoint2 = rvec;
				system.AddConstraint(c.Create(parts[j.a], parts[j.b]));
				Jolt.destroy(c);
			}
			return parts;
		},
		setVelocityXZ (body, vx, vz) {
			const id = body.GetID();
			const v = bodies.GetLinearVelocity(id);
			vec.Set(vx, v.GetY(), vz);
			bodies.SetLinearVelocity(id, vec);
		},
		position (body) {
			const p = body.GetPosition();
			return { x: p.GetX(), y: p.GetY(), z: p.GetZ() };
		},
		step (dt) {
			jolt.Step(dt, 1);
		},
		raycast (ox, oy, oz, dx, dy, dz, maxDist) {
			rvec.Set(ox, oy, oz);
			ray.mOrigin = rvec;
			vec.Set(dx * maxDist, dy * maxDist, dz * maxDist);
			ray.mDirection = vec;
			collector.Reset();
			query.CastRay(ray, raySettings, collector, bpFilter, objFilter, bodyFilter, shapeFilter);
			return collector.HadHit();
		},
		destroyWorld () {
			Jolt.destroy(jolt);
		}
	};
}
