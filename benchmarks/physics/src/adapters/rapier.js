/**
 * Rapier (Rust, wasm-bindgen). Defaults: 4 solver iterations.
 * @param {"plain" | "simd"} flavour
 */
export async function createRapier (flavour = "plain") {
	const RAPIER = flavour === "simd"
		? (await import("@dimforge/rapier3d-simd-compat")).default
		: (await import("@dimforge/rapier3d-compat")).default;
	await RAPIER.init();

	let world;
	let ray;
	// Ragdoll parts don't collide with the part they are jointed to (joint contacts off)

	return {
		name: flavour === "simd" ? "Rapier SIMD" : "Rapier",
		version: RAPIER.version(),
		createWorld (dt) {
			world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
			world.timestep = dt;
			ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
		},
		addStaticBox (x, y, z, hx, hy, hz) {
			const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
			world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setFriction(0.5), body);
		},
		addDynamicBox (x, y, z, hx, hy, hz) {
			const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z));
			world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setDensity(1000).setFriction(0.5), body);
			return body;
		},
		addCapsule (x, y, z, radius, halfHeight) {
			const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z).lockRotations());
			world.createCollider(RAPIER.ColliderDesc.capsule(halfHeight, radius).setDensity(1000).setFriction(0.5), body);
			return body;
		},
		addRagdoll (ox, oy, oz, layout) {
			const bodies = layout.parts.map((p) => {
				const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(ox + p.x, oy + p.y, oz + p.z));
				world.createCollider(RAPIER.ColliderDesc.cuboid(p.hx, p.hy, p.hz).setDensity(1000).setFriction(0.5), body);
				return body;
			});
			for (const j of layout.joints) {
				const a = layout.parts[j.a], b = layout.parts[j.b];
				const params = RAPIER.JointData.spherical(
					{ x: j.x - a.x, y: j.y - a.y, z: j.z - a.z },
					{ x: j.x - b.x, y: j.y - b.y, z: j.z - b.z }
				);
				const joint = world.createImpulseJoint(params, bodies[j.a], bodies[j.b], true);
				joint.setContactsEnabled(false);
			}
			return bodies;
		},
		setVelocityXZ (body, vx, vz) {
			const v = body.linvel();
			body.setLinvel({ x: vx, y: v.y, z: vz }, true);
		},
		position (body) {
			return body.translation();
		},
		step () {
			world.step();
		},
		raycast (ox, oy, oz, dx, dy, dz, maxDist) {
			ray.origin.x = ox; ray.origin.y = oy; ray.origin.z = oz;
			ray.dir.x = dx; ray.dir.y = dy; ray.dir.z = dz;
			return world.castRay(ray, maxDist, true) !== null;
		},
		destroyWorld () {
			world.free();
		}
	};
}
