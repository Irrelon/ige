import { defineConfig } from "vite";

// Cross-origin isolation: precise timers, and SharedArrayBuffer for Jolt's
// multithreaded build
const isolation = {
	"Cross-Origin-Opener-Policy": "same-origin",
	"Cross-Origin-Embedder-Policy": "require-corp"
};

export default defineConfig({
	server: { headers: isolation },
	preview: { headers: isolation },
	// The engines load their .wasm relative to their own module, which
	// dependency pre-bundling would break
	optimizeDeps: {
		exclude: ["jolt-physics", "physx-js-webidl", "@dimforge/rapier3d-compat", "@dimforge/rapier3d-simd-compat"]
	}
});
