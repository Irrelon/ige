// meshoptimizer's package exports its decoder as "meshoptimizer/decoder", which the engine's `node` module resolution
// can't follow (the game's `bundler` one does, and reads the package's own types)
declare module "meshoptimizer/decoder" {
	export const MeshoptDecoder: {
		supported: boolean;
		ready: Promise<void>;
		decodeGltfBuffer: (target: Uint8Array, count: number, size: number, source: Uint8Array, mode: string, filter?: string) => void;
	};
}
