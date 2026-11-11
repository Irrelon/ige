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

/** Exposes the accessor reader. */
class AccessorLoader extends IgeGltfLoader {
	read (gltf: any, index: number, buffers: ArrayBuffer[]) {
		return this._getAccessorData(gltf, index, buffers);
	}
}

describe("IgeGltfLoader accessors", () => {
	it("reads normalized integers (vertex colours as bytes or shorts) as 0-1", () => {
		const bytes = new Uint8Array([255, 128, 0, 255]);
		const shorts = new Uint16Array([65535, 0]);
		const buffer = new Uint8Array(8);
		buffer.set(bytes, 0);
		buffer.set(new Uint8Array(shorts.buffer), 4);
		const gltf = {
			bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 4 }, { buffer: 0, byteOffset: 4, byteLength: 4 }],
			accessors: [
				{ bufferView: 0, componentType: 5121, normalized: true, count: 1, type: "VEC4" },
				{ bufferView: 1, componentType: 5123, normalized: true, count: 1, type: "VEC2" },
				{ bufferView: 0, componentType: 5121, count: 1, type: "VEC4" } // not normalized: raw (e.g. joints)
			]
		};
		const loader = new AccessorLoader();
		expect(Array.from(loader.read(gltf, 0, [buffer.buffer])).map((v) => +v.toFixed(3))).toEqual([1, 0.502, 0, 1]);
		expect(Array.from(loader.read(gltf, 1, [buffer.buffer]))).toEqual([1, 0]);
		expect(Array.from(loader.read(gltf, 2, [buffer.buffer]))).toEqual([255, 128, 0, 255]);
	});
});

/** Exposes the primitive parser. */
class PrimitiveLoader extends IgeGltfLoader {
	primitive (gltf: any, primitive: any, buffers: ArrayBuffer[], index: number) {
		return this._parsePrimitive(gltf, primitive, buffers, index);
	}
}

describe("IgeGltfLoader ids", () => {
	it("gives every primitive its own id, even from files parsed in the same millisecond", () => {
		// One triangle; two "files" with the same primitive index, parsed back to back
		const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
		const gltf = {
			bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: positions.byteLength }],
			accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }]
		};
		const loader = new PrimitiveLoader();
		const realNow = Date.now;
		Date.now = () => 1000; // the same millisecond for both
		try {
			const a = loader.primitive(gltf, { attributes: { POSITION: 0 } }, [positions.buffer], 0);
			const b = new PrimitiveLoader().primitive(gltf, { attributes: { POSITION: 0 } }, [positions.buffer], 0);
			expect(a.id).not.toEqual(b.id);
		} finally {
			Date.now = realNow;
		}
	});
});

/** Exposes the material parser. */
class MaterialLoader extends IgeGltfLoader {
	materials (gltf: any, textures: any[], images: any[]) {
		return this._parseMaterials(gltf, textures, images);
	}
}

describe("IgeGltfLoader emissive maps", () => {
	const image = { data: new Blob(["png"]) };
	const textures = [{ imageIndex: 0 }];

	it("keeps an emissive texture, glowing white when no factor is given", () => {
		const [material] = new MaterialLoader().materials({ materials: [{ emissiveTexture: { index: 0 } }] }, textures, [image]) as any[];
		expect(material.emissiveTextureData()).toBe(image.data);
		expect(material.emissiveColor()).toEqual({ r: 1, g: 1, b: 1 });
	});

	it("uses the factor given with it, and KHR_materials_emissive_strength's strength", () => {
		const [material] = new MaterialLoader().materials({
			materials: [{
				emissiveTexture: { index: 0 },
				emissiveFactor: [1, 0.5, 0.25],
				extensions: { KHR_materials_emissive_strength: { emissiveStrength: 4 } }
			}]
		}, textures, [image]) as any[];
		expect(material.emissiveColor()).toEqual({ r: 1, g: 0.5, b: 0.25 });
		expect(material.emissiveIntensity()).toBe(4);
	});

	it("has no emissive map without one", () => {
		const [material] = new MaterialLoader().materials({ materials: [{ emissiveFactor: [0.2, 0.2, 0.2] }] }, textures, [image]) as any[];
		expect(material.emissiveTextureData()).toBeUndefined();
	});
});
