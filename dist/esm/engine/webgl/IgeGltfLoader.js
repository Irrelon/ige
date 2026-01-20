import { IgeBaseClass } from "../core/IgeBaseClass.js"
import { IgeEntity } from "../core/IgeEntity.js"
import { IgeWebGlMaterial, IgeWebGlPBRMaterial } from "./IgeWebGlMaterial.js"
/**
 * GLTF Accessor component types.
 */
var GltfComponentType;
(function (GltfComponentType) {
    GltfComponentType[GltfComponentType["BYTE"] = 5120] = "BYTE";
    GltfComponentType[GltfComponentType["UNSIGNED_BYTE"] = 5121] = "UNSIGNED_BYTE";
    GltfComponentType[GltfComponentType["SHORT"] = 5122] = "SHORT";
    GltfComponentType[GltfComponentType["UNSIGNED_SHORT"] = 5123] = "UNSIGNED_SHORT";
    GltfComponentType[GltfComponentType["UNSIGNED_INT"] = 5125] = "UNSIGNED_INT";
    GltfComponentType[GltfComponentType["FLOAT"] = 5126] = "FLOAT";
})(GltfComponentType || (GltfComponentType = {}));
/**
 * GLTF Accessor types and their component counts.
 */
const GLTF_TYPE_SIZES = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT2: 4,
    MAT3: 9,
    MAT4: 16
};
/**
 * GLTF/GLB model loader for WebGL renderer.
 * Supports GLTF 2.0 specification.
 */
export class IgeGltfLoader extends IgeBaseClass {
    classId = "IgeGltfLoader";
    // Cache loaded models
    _modelCache = new Map();
    /**
     * Load a GLTF or GLB model from URL.
     */
    async load(url, modelId) {
        const id = modelId || url;
        // Check cache
        if (this._modelCache.has(id)) {
            return this._modelCache.get(id);
        }
        this.log(`Loading GLTF model: ${url}`);
        // Determine if GLB or GLTF
        const isGlb = url.toLowerCase().endsWith(".glb");
        let gltfData;
        let binaryData = null;
        if (isGlb) {
            // Load GLB binary format
            const response = await fetch(url);
            const buffer = await response.arrayBuffer();
            const result = this._parseGlb(buffer);
            gltfData = result.json;
            binaryData = result.binary;
        }
        else {
            // Load GLTF JSON format
            const response = await fetch(url);
            gltfData = await response.json();
        }
        // Get base URL for relative paths
        const baseUrl = url.substring(0, url.lastIndexOf("/") + 1);
        // Load binary buffers if not GLB
        const buffers = await this._loadBuffers(gltfData, baseUrl, binaryData);
        // Parse the GLTF data
        const model = await this._parseGltf(gltfData, buffers, baseUrl, id);
        // Cache and return
        this._modelCache.set(id, model);
        this.log(`GLTF model loaded: ${model.name} with ${model.meshes.length} meshes`);
        return model;
    }
    /**
     * Parse GLB binary format.
     */
    _parseGlb(buffer) {
        const dataView = new DataView(buffer);
        // Read header
        const magic = dataView.getUint32(0, true);
        if (magic !== 0x46546c67) {
            // "glTF"
            throw new Error("Invalid GLB file: incorrect magic number");
        }
        const version = dataView.getUint32(4, true);
        if (version !== 2) {
            throw new Error(`Unsupported GLB version: ${version}`);
        }
        // const totalLength = dataView.getUint32(8, true);
        // Read JSON chunk
        let offset = 12;
        const jsonChunkLength = dataView.getUint32(offset, true);
        const jsonChunkType = dataView.getUint32(offset + 4, true);
        if (jsonChunkType !== 0x4e4f534a) {
            // "JSON"
            throw new Error("Invalid GLB: first chunk must be JSON");
        }
        const jsonData = new Uint8Array(buffer, offset + 8, jsonChunkLength);
        const jsonText = new TextDecoder().decode(jsonData);
        const json = JSON.parse(jsonText);
        // Read binary chunk (if present)
        let binary = null;
        offset += 8 + jsonChunkLength;
        if (offset < buffer.byteLength) {
            const binaryChunkLength = dataView.getUint32(offset, true);
            const binaryChunkType = dataView.getUint32(offset + 4, true);
            if (binaryChunkType === 0x004e4942) {
                // "BIN\0"
                binary = buffer.slice(offset + 8, offset + 8 + binaryChunkLength);
            }
        }
        return { json, binary };
    }
    /**
     * Load external buffers referenced in GLTF.
     */
    async _loadBuffers(gltf, baseUrl, embeddedBinary) {
        const buffers = [];
        if (!gltf.buffers)
            return buffers;
        for (let i = 0; i < gltf.buffers.length; i++) {
            const bufferDef = gltf.buffers[i];
            if (embeddedBinary && i === 0 && !bufferDef.uri) {
                // GLB embedded binary
                buffers.push(embeddedBinary);
            }
            else if (bufferDef.uri) {
                if (bufferDef.uri.startsWith("data:")) {
                    // Base64 encoded data URI
                    const base64 = bufferDef.uri.split(",")[1];
                    const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
                    buffers.push(binary.buffer);
                }
                else {
                    // External file
                    const response = await fetch(baseUrl + bufferDef.uri);
                    buffers.push(await response.arrayBuffer());
                }
            }
        }
        return buffers;
    }
    /**
     * Parse GLTF JSON data into model.
     */
    async _parseGltf(gltf, buffers, baseUrl, modelId) {
        // Parse materials
        const materials = this._parseMaterials(gltf);
        // Parse meshes
        const meshes = this._parseMeshes(gltf, buffers);
        // Parse scenes
        const scenes = [];
        if (gltf.scenes) {
            for (const sceneDef of gltf.scenes) {
                scenes.push({
                    name: sceneDef.name,
                    nodeIndices: sceneDef.nodes || []
                });
            }
        }
        return {
            id: modelId,
            name: gltf.asset?.name || modelId,
            scenes,
            defaultSceneIndex: gltf.scene || 0,
            meshes,
            materials
        };
    }
    /**
     * Parse materials from GLTF.
     */
    _parseMaterials(gltf) {
        const materials = [];
        if (!gltf.materials) {
            // Create default material
            const defaultMat = new IgeWebGlMaterial("default");
            defaultMat.color(0.8, 0.8, 0.8, 1);
            materials.push(defaultMat);
            return materials;
        }
        for (const matDef of gltf.materials) {
            const material = new IgeWebGlPBRMaterial(matDef.name);
            material.name(matDef.name || "Untitled");
            // Parse PBR metallic-roughness
            if (matDef.pbrMetallicRoughness) {
                const pbr = matDef.pbrMetallicRoughness;
                // Base color
                if (pbr.baseColorFactor) {
                    material.color(pbr.baseColorFactor[0], pbr.baseColorFactor[1], pbr.baseColorFactor[2], pbr.baseColorFactor[3] ?? 1);
                }
                // Metallic and roughness
                if (pbr.metallicFactor !== undefined) {
                    material.metallic(pbr.metallicFactor);
                }
                if (pbr.roughnessFactor !== undefined) {
                    material.roughness(pbr.roughnessFactor);
                }
            }
            // Parse emissive
            if (matDef.emissiveFactor) {
                material.emissiveColor(matDef.emissiveFactor[0], matDef.emissiveFactor[1], matDef.emissiveFactor[2]);
            }
            // Parse alpha mode
            if (matDef.alphaMode === "BLEND") {
                material.blendMode("transparent");
            }
            // Parse double-sided
            if (matDef.doubleSided) {
                material.cullMode("none");
            }
            materials.push(material);
        }
        return materials;
    }
    /**
     * Parse meshes from GLTF.
     */
    _parseMeshes(gltf, buffers) {
        const meshes = [];
        if (!gltf.meshes)
            return meshes;
        let primitiveIndex = 0;
        for (const meshDef of gltf.meshes) {
            const primitives = [];
            for (const primDef of meshDef.primitives) {
                const geometry = this._parsePrimitive(gltf, primDef, buffers, primitiveIndex++);
                primitives.push({
                    geometry,
                    materialIndex: primDef.material
                });
            }
            meshes.push({
                name: meshDef.name,
                primitives
            });
        }
        return meshes;
    }
    /**
     * Parse a single mesh primitive.
     */
    _parsePrimitive(gltf, primitive, buffers, primitiveIndex = 0) {
        const geometry = {
            id: `gltf_primitive_${Date.now()}_${primitiveIndex}`,
            type: "gltf"
        };
        // Parse vertex positions (required)
        if (primitive.attributes.POSITION !== undefined) {
            geometry.vertices = this._getAccessorData(gltf, primitive.attributes.POSITION, buffers);
        }
        // Parse normals
        if (primitive.attributes.NORMAL !== undefined) {
            geometry.normals = this._getAccessorData(gltf, primitive.attributes.NORMAL, buffers);
        }
        // Parse texture coordinates
        if (primitive.attributes.TEXCOORD_0 !== undefined) {
            geometry.uvs = this._getAccessorData(gltf, primitive.attributes.TEXCOORD_0, buffers);
        }
        // Parse vertex colors
        if (primitive.attributes.COLOR_0 !== undefined) {
            geometry.colors = this._getAccessorData(gltf, primitive.attributes.COLOR_0, buffers);
        }
        // Parse indices
        if (primitive.indices !== undefined) {
            const indexData = this._getAccessorData(gltf, primitive.indices, buffers);
            // Convert to Uint16Array or Uint32Array based on size
            const accessor = gltf.accessors[primitive.indices];
            if (accessor.componentType === GltfComponentType.UNSIGNED_INT) {
                geometry.indices = new Uint32Array(indexData);
            }
            else {
                geometry.indices = new Uint16Array(indexData);
            }
        }
        return geometry;
    }
    /**
     * Get typed array data from accessor.
     */
    _getAccessorData(gltf, accessorIndex, buffers) {
        const accessor = gltf.accessors[accessorIndex];
        const bufferView = gltf.bufferViews[accessor.bufferView];
        const buffer = buffers[bufferView.buffer];
        const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
        const componentCount = GLTF_TYPE_SIZES[accessor.type];
        const elementCount = accessor.count * componentCount;
        // Create appropriate typed array based on component type
        switch (accessor.componentType) {
            case GltfComponentType.FLOAT:
                return new Float32Array(buffer, byteOffset, elementCount);
            case GltfComponentType.UNSIGNED_SHORT:
                const ushortData = new Uint16Array(buffer, byteOffset, elementCount);
                return new Float32Array(ushortData); // Convert to float
            case GltfComponentType.UNSIGNED_INT:
                const uintData = new Uint32Array(buffer, byteOffset, elementCount);
                return new Float32Array(uintData);
            case GltfComponentType.UNSIGNED_BYTE:
                const ubyteData = new Uint8Array(buffer, byteOffset, elementCount);
                return new Float32Array(ubyteData);
            case GltfComponentType.SHORT:
                const shortData = new Int16Array(buffer, byteOffset, elementCount);
                return new Float32Array(shortData);
            case GltfComponentType.BYTE:
                const byteData = new Int8Array(buffer, byteOffset, elementCount);
                return new Float32Array(byteData);
            default:
                throw new Error(`Unsupported accessor component type: ${accessor.componentType}`);
        }
    }
    /**
     * Create an IgeEntity hierarchy from a loaded model.
     */
    createEntity(model, sceneIndex) {
        const root = new IgeEntity();
        root.id(model.id);
        // Get the scene to instantiate
        const scene = model.scenes[sceneIndex ?? model.defaultSceneIndex];
        if (!scene) {
            this.log("No scene found in model", "warning");
            return root;
        }
        // For now, create a simple entity for each mesh
        // Full node hierarchy would require more complex implementation
        for (const mesh of model.meshes) {
            for (const primitive of mesh.primitives) {
                const entity = new IgeEntity();
                entity.id(`${model.id}_${mesh.name || "mesh"}`);
                // Store geometry data on entity
                entity._geometryData = primitive.geometry;
                // Store material reference
                if (primitive.materialIndex !== undefined && model.materials[primitive.materialIndex]) {
                    entity._material = model.materials[primitive.materialIndex];
                }
                entity.mount(root);
            }
        }
        return root;
    }
    /**
     * Check if a model is cached.
     */
    isCached(modelId) {
        return this._modelCache.has(modelId);
    }
    /**
     * Get a cached model.
     */
    getCached(modelId) {
        return this._modelCache.get(modelId);
    }
    /**
     * Clear model cache.
     */
    clearCache() {
        this._modelCache.clear();
    }
}
// Export singleton instance
export const igeGltfLoader = new IgeGltfLoader();
