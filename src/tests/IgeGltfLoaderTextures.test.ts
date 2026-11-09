import { IgeGltfLoader } from "@/engine/webgl/IgeGltfLoader";

/** Exposes the texture parser. */
class TestLoader extends IgeGltfLoader {
	textures (gltf: any) {
		return this._parseTextures(gltf);
	}
}

describe("IgeGltfLoader textures", () => {
	it("uses an EXT_texture_webp image, with or without a plain source beside it", () => {
		const loader = new TestLoader();
		const textures = loader.textures({
			textures: [
				{ source: 0 },
				{ extensions: { EXT_texture_webp: { source: 2 } } }, // WebP only (Blender's exporter)
				{ source: 1, extensions: { EXT_texture_webp: { source: 3 } } } // PNG fallback and WebP
			]
		});
		expect(textures.map((t) => t.imageIndex)).toEqual([0, 2, 3]);
	});
});
