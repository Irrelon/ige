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
// IgeGltfAnimation is now IgeAnimationClipData from types
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
        // Parse nodes first (needed for skeleton hierarchy)
        const nodes = this._parseNodes(gltf);
        // Parse images and textures
        const images = this._parseImages(gltf, buffers, baseUrl);
        const textures = this._parseTextures(gltf);
        // Parse materials (pass textures for texture references)
        const materials = this._parseMaterials(gltf, textures, images);
        // Parse skins (skeletons)
        const skins = this._parseSkins(gltf, buffers, nodes);
        // Parse meshes (pass skins for skinning data)
        const meshes = this._parseMeshes(gltf, buffers, skins);
        // Parse animations
        const animations = this._parseAnimations(gltf, buffers, skins);
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
        const model = {
            id: modelId,
            name: gltf.asset?.name || modelId,
            scenes,
            defaultSceneIndex: gltf.scene || 0,
            meshes,
            materials,
            nodes
        };
        // Add images and textures if present
        if (images.length > 0) {
            model.images = images;
        }
        if (textures.length > 0) {
            model.textures = textures;
        }
        // Add skins and animations if present
        if (skins.length > 0) {
            model.skins = skins;
        }
        if (animations.length > 0) {
            model.animations = animations;
        }
        return model;
    }
    /**
     * Parse images from GLTF (embedded in bufferViews or external URIs).
     */
    _parseImages(gltf, buffers, baseUrl) {
        const images = [];
        if (!gltf.images) {
            return images;
        }
        for (const imageDef of gltf.images) {
            const image = {
                name: imageDef.name,
                mimeType: imageDef.mimeType
            };
            if (imageDef.bufferView !== undefined) {
                // Image data is embedded in a buffer view
                const bufferViewDef = gltf.bufferViews[imageDef.bufferView];
                const bufferIndex = bufferViewDef.buffer || 0;
                const buffer = buffers[bufferIndex];
                const byteOffset = bufferViewDef.byteOffset || 0;
                const byteLength = bufferViewDef.byteLength;
                // Extract image data as a Blob
                const imageData = new Uint8Array(buffer, byteOffset, byteLength);
                image.data = new Blob([imageData], { type: imageDef.mimeType || "image/png" });
            }
            else if (imageDef.uri) {
                // External image URI
                if (imageDef.uri.startsWith("data:")) {
                    // Data URI - decode it
                    const matches = imageDef.uri.match(/^data:([^;]+);base64,(.+)$/);
                    if (matches) {
                        const mimeType = matches[1];
                        const base64Data = matches[2];
                        const binaryStr = atob(base64Data);
                        const bytes = new Uint8Array(binaryStr.length);
                        for (let i = 0; i < binaryStr.length; i++) {
                            bytes[i] = binaryStr.charCodeAt(i);
                        }
                        image.data = new Blob([bytes], { type: mimeType });
                        image.mimeType = mimeType;
                    }
                }
                else {
                    // External file reference
                    image.uri = baseUrl + imageDef.uri;
                }
            }
            images.push(image);
        }
        return images;
    }
    /**
     * Parse textures from GLTF.
     */
    _parseTextures(gltf) {
        const textures = [];
        if (!gltf.textures) {
            return textures;
        }
        for (const texDef of gltf.textures) {
            const texture = {
                name: texDef.name,
                imageIndex: texDef.source
            };
            // Parse sampler if present
            if (texDef.sampler !== undefined && gltf.samplers && gltf.samplers[texDef.sampler]) {
                const samplerDef = gltf.samplers[texDef.sampler];
                texture.sampler = {
                    magFilter: samplerDef.magFilter,
                    minFilter: samplerDef.minFilter,
                    wrapS: samplerDef.wrapS,
                    wrapT: samplerDef.wrapT
                };
            }
            textures.push(texture);
        }
        return textures;
    }
    /**
     * Parse materials from GLTF.
     */
    _parseMaterials(gltf, textures, images) {
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
                // Base color texture
                if (pbr.baseColorTexture !== undefined) {
                    const textureIndex = pbr.baseColorTexture.index;
                    const texCoord = pbr.baseColorTexture.texCoord ?? 0;
                    if (textureIndex !== undefined && textures[textureIndex]) {
                        const texture = textures[textureIndex];
                        const imageIndex = texture.imageIndex;
                        if (imageIndex !== undefined && images[imageIndex] && images[imageIndex].data) {
                            material.baseColorTextureData(images[imageIndex].data, texCoord);
                            this.log(`Material "${matDef.name}" has base color texture from image ${imageIndex}`);
                        }
                    }
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
    _parseMeshes(gltf, buffers, skins) {
        const meshes = [];
        if (!gltf.meshes)
            return meshes;
        // Build a map of mesh index to skin index from nodes
        const meshSkinMap = new Map();
        if (gltf.nodes) {
            for (const node of gltf.nodes) {
                if (node.mesh !== undefined && node.skin !== undefined) {
                    meshSkinMap.set(node.mesh, node.skin);
                }
            }
        }
        let primitiveIndex = 0;
        for (let meshIndex = 0; meshIndex < gltf.meshes.length; meshIndex++) {
            const meshDef = gltf.meshes[meshIndex];
            const primitives = [];
            const skinIndex = meshSkinMap.get(meshIndex);
            for (const primDef of meshDef.primitives) {
                const geometry = this._parsePrimitive(gltf, primDef, buffers, primitiveIndex++, skinIndex, skins);
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
    _parsePrimitive(gltf, primitive, buffers, primitiveIndex = 0, skinIndex, skins) {
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
        // Parse tangents
        if (primitive.attributes.TANGENT !== undefined) {
            geometry.tangents = this._getAccessorData(gltf, primitive.attributes.TANGENT, buffers);
        }
        // Parse skinning data (bone indices and weights)
        if (primitive.attributes.JOINTS_0 !== undefined) {
            // JOINTS_0 should be UNSIGNED_BYTE or UNSIGNED_SHORT
            geometry.boneIndices = this._getAccessorDataAsUint8(gltf, primitive.attributes.JOINTS_0, buffers);
        }
        if (primitive.attributes.WEIGHTS_0 !== undefined) {
            geometry.boneWeights = this._getAccessorData(gltf, primitive.attributes.WEIGHTS_0, buffers);
        }
        // Link to skin/skeleton if this mesh has skinning
        if (skinIndex !== undefined && skins && skins[skinIndex]) {
            geometry.skinIndex = skinIndex;
            geometry.skeletonId = skins[skinIndex].skeleton.id;
        }
        // Parse indices - use specialized method for integer data
        if (primitive.indices !== undefined) {
            geometry.indices = this._getAccessorDataAsIndices(gltf, primitive.indices, buffers);
        }
        return geometry;
    }
    /**
     * Get typed array data from accessor.
     * Note: We copy data to new arrays to avoid byte alignment issues.
     */
    _getAccessorData(gltf, accessorIndex, buffers) {
        const accessor = gltf.accessors[accessorIndex];
        const bufferView = gltf.bufferViews[accessor.bufferView];
        const buffer = buffers[bufferView.buffer];
        const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
        const componentCount = GLTF_TYPE_SIZES[accessor.type];
        const elementCount = accessor.count * componentCount;
        // Get raw bytes first to avoid alignment issues
        const rawBytes = new Uint8Array(buffer, byteOffset);
        // Create appropriate typed array based on component type
        // We copy data to new arrays to avoid byte alignment issues
        switch (accessor.componentType) {
            case GltfComponentType.FLOAT: {
                const result = new Float32Array(elementCount);
                const dataView = new DataView(buffer, byteOffset, elementCount * 4);
                for (let i = 0; i < elementCount; i++) {
                    result[i] = dataView.getFloat32(i * 4, true); // little-endian
                }
                return result;
            }
            case GltfComponentType.UNSIGNED_SHORT: {
                const result = new Float32Array(elementCount);
                const dataView = new DataView(buffer, byteOffset, elementCount * 2);
                for (let i = 0; i < elementCount; i++) {
                    result[i] = dataView.getUint16(i * 2, true);
                }
                return result;
            }
            case GltfComponentType.UNSIGNED_INT: {
                const result = new Float32Array(elementCount);
                const dataView = new DataView(buffer, byteOffset, elementCount * 4);
                for (let i = 0; i < elementCount; i++) {
                    result[i] = dataView.getUint32(i * 4, true);
                }
                return result;
            }
            case GltfComponentType.UNSIGNED_BYTE: {
                const result = new Float32Array(elementCount);
                for (let i = 0; i < elementCount; i++) {
                    result[i] = rawBytes[i];
                }
                return result;
            }
            case GltfComponentType.SHORT: {
                const result = new Float32Array(elementCount);
                const dataView = new DataView(buffer, byteOffset, elementCount * 2);
                for (let i = 0; i < elementCount; i++) {
                    result[i] = dataView.getInt16(i * 2, true);
                }
                return result;
            }
            case GltfComponentType.BYTE: {
                const result = new Float32Array(elementCount);
                const signedBytes = new Int8Array(buffer, byteOffset, elementCount);
                for (let i = 0; i < elementCount; i++) {
                    result[i] = signedBytes[i];
                }
                return result;
            }
            default:
                throw new Error(`Unsupported accessor component type: ${accessor.componentType}`);
        }
    }
    /**
     * Get accessor data as index array (Uint16Array or Uint32Array).
     * Note: We copy data to new arrays to avoid byte alignment issues.
     */
    _getAccessorDataAsIndices(gltf, accessorIndex, buffers) {
        const accessor = gltf.accessors[accessorIndex];
        const bufferView = gltf.bufferViews[accessor.bufferView];
        const buffer = buffers[bufferView.buffer];
        const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
        const elementCount = accessor.count;
        switch (accessor.componentType) {
            case GltfComponentType.UNSIGNED_INT: {
                const result = new Uint32Array(elementCount);
                const dataView = new DataView(buffer, byteOffset, elementCount * 4);
                for (let i = 0; i < elementCount; i++) {
                    result[i] = dataView.getUint32(i * 4, true);
                }
                return result;
            }
            case GltfComponentType.UNSIGNED_SHORT: {
                const result = new Uint16Array(elementCount);
                const dataView = new DataView(buffer, byteOffset, elementCount * 2);
                for (let i = 0; i < elementCount; i++) {
                    result[i] = dataView.getUint16(i * 2, true);
                }
                return result;
            }
            case GltfComponentType.UNSIGNED_BYTE: {
                // Convert to Uint16Array for WebGL compatibility
                const result = new Uint16Array(elementCount);
                const rawBytes = new Uint8Array(buffer, byteOffset, elementCount);
                for (let i = 0; i < elementCount; i++) {
                    result[i] = rawBytes[i];
                }
                return result;
            }
            default:
                throw new Error(`Unsupported index accessor type: ${accessor.componentType}`);
        }
    }
    /**
     * Get accessor data as Uint8Array (for bone indices).
     * Note: We copy data to new arrays to avoid byte alignment issues.
     */
    _getAccessorDataAsUint8(gltf, accessorIndex, buffers) {
        const accessor = gltf.accessors[accessorIndex];
        const bufferView = gltf.bufferViews[accessor.bufferView];
        const buffer = buffers[bufferView.buffer];
        const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
        const componentCount = GLTF_TYPE_SIZES[accessor.type];
        const elementCount = accessor.count * componentCount;
        // JOINTS_0 can be UNSIGNED_BYTE or UNSIGNED_SHORT
        switch (accessor.componentType) {
            case GltfComponentType.UNSIGNED_BYTE: {
                // Copy to new array to avoid alignment issues
                const rawBytes = new Uint8Array(buffer, byteOffset, elementCount);
                const result = new Uint8Array(elementCount);
                result.set(rawBytes);
                return result;
            }
            case GltfComponentType.UNSIGNED_SHORT: {
                // Convert UNSIGNED_SHORT to UNSIGNED_BYTE using DataView for safety
                const result = new Uint8Array(elementCount);
                const dataView = new DataView(buffer, byteOffset, elementCount * 2);
                for (let i = 0; i < elementCount; i++) {
                    result[i] = dataView.getUint16(i * 2, true); // Should fit since bone count < 256
                }
                return result;
            }
            default:
                throw new Error(`Unsupported JOINTS accessor type: ${accessor.componentType}`);
        }
    }
    /**
     * Parse GLTF nodes.
     */
    _parseNodes(gltf) {
        const nodes = [];
        if (!gltf.nodes)
            return nodes;
        for (const nodeDef of gltf.nodes) {
            nodes.push({
                name: nodeDef.name,
                children: nodeDef.children,
                translation: nodeDef.translation,
                rotation: nodeDef.rotation,
                scale: nodeDef.scale,
                matrix: nodeDef.matrix,
                mesh: nodeDef.mesh,
                skin: nodeDef.skin
            });
        }
        return nodes;
    }
    /**
     * Parse GLTF skins (skeletons).
     */
    _parseSkins(gltf, buffers, nodes) {
        const skins = [];
        if (!gltf.skins)
            return skins;
        for (let skinIndex = 0; skinIndex < gltf.skins.length; skinIndex++) {
            const skinDef = gltf.skins[skinIndex];
            const jointNodeIndices = skinDef.joints || [];
            const boneCount = jointNodeIndices.length;
            // Get inverse bind matrices
            let inverseBindMatrices;
            if (skinDef.inverseBindMatrices !== undefined) {
                inverseBindMatrices = this._getAccessorData(gltf, skinDef.inverseBindMatrices, buffers);
            }
            else {
                // Default to identity matrices
                inverseBindMatrices = new Float32Array(boneCount * 16);
                for (let i = 0; i < boneCount; i++) {
                    const offset = i * 16;
                    inverseBindMatrices[offset] = 1;
                    inverseBindMatrices[offset + 5] = 1;
                    inverseBindMatrices[offset + 10] = 1;
                    inverseBindMatrices[offset + 15] = 1;
                }
            }
            // Build bone hierarchy
            const bones = [];
            // Create a map from node index to bone index
            const nodeIndexToBoneIndex = new Map();
            for (let i = 0; i < jointNodeIndices.length; i++) {
                nodeIndexToBoneIndex.set(jointNodeIndices[i], i);
            }
            // Build bones array
            for (let boneIndex = 0; boneIndex < boneCount; boneIndex++) {
                const nodeIndex = jointNodeIndices[boneIndex];
                const nodeDef = gltf.nodes[nodeIndex];
                // Find parent bone index
                let parentIndex = -1;
                for (let i = 0; i < gltf.nodes.length; i++) {
                    const potentialParent = gltf.nodes[i];
                    if (potentialParent.children && potentialParent.children.includes(nodeIndex)) {
                        if (nodeIndexToBoneIndex.has(i)) {
                            parentIndex = nodeIndexToBoneIndex.get(i);
                        }
                        break;
                    }
                }
                // Find child bone indices
                const childIndices = [];
                if (nodeDef.children) {
                    for (const childNodeIndex of nodeDef.children) {
                        if (nodeIndexToBoneIndex.has(childNodeIndex)) {
                            childIndices.push(nodeIndexToBoneIndex.get(childNodeIndex));
                        }
                    }
                }
                // Get local bind transform
                const localBindTransform = this._getNodeLocalTransform(nodeDef);
                // Get inverse bind matrix for this bone
                const inverseBindMatrix = new Float32Array(16);
                inverseBindMatrix.set(inverseBindMatrices.subarray(boneIndex * 16, boneIndex * 16 + 16));
                bones.push({
                    name: nodeDef.name || `bone_${boneIndex}`,
                    index: boneIndex,
                    parentIndex,
                    childIndices,
                    localBindTransform,
                    inverseBindMatrix
                });
            }
            // Find root bone indices
            const rootBoneIndices = bones
                .filter(bone => bone.parentIndex === -1)
                .map(bone => bone.index);
            const skeleton = {
                id: `skeleton_${skinIndex}_${Date.now()}`,
                name: skinDef.name || `skeleton_${skinIndex}`,
                bones,
                rootBoneIndices,
                boneCount
            };
            skins.push({
                name: skinDef.name,
                skeleton,
                jointNodeIndices
            });
        }
        return skins;
    }
    /**
     * Get local transform matrix from a GLTF node.
     */
    _getNodeLocalTransform(nodeDef) {
        const matrix = new Float32Array(16);
        if (nodeDef.matrix) {
            // Use provided matrix directly
            matrix.set(nodeDef.matrix);
        }
        else {
            // Compose from TRS
            const t = nodeDef.translation || [0, 0, 0];
            const r = nodeDef.rotation || [0, 0, 0, 1]; // quaternion (x, y, z, w)
            const s = nodeDef.scale || [1, 1, 1];
            // Convert quaternion to rotation matrix and compose with scale and translation
            this._composeMatrix(matrix, t, r, s);
        }
        return matrix;
    }
    /**
     * Compose a 4x4 matrix from translation, rotation (quaternion), and scale.
     */
    _composeMatrix(out, translation, rotation, scale) {
        const x = rotation[0], y = rotation[1], z = rotation[2], w = rotation[3];
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;
        const sx = scale[0], sy = scale[1], sz = scale[2];
        out[0] = (1 - (yy + zz)) * sx;
        out[1] = (xy + wz) * sx;
        out[2] = (xz - wy) * sx;
        out[3] = 0;
        out[4] = (xy - wz) * sy;
        out[5] = (1 - (xx + zz)) * sy;
        out[6] = (yz + wx) * sy;
        out[7] = 0;
        out[8] = (xz + wy) * sz;
        out[9] = (yz - wx) * sz;
        out[10] = (1 - (xx + yy)) * sz;
        out[11] = 0;
        out[12] = translation[0];
        out[13] = translation[1];
        out[14] = translation[2];
        out[15] = 1;
    }
    /**
     * Parse GLTF animations.
     */
    _parseAnimations(gltf, buffers, skins) {
        const animations = [];
        if (!gltf.animations)
            return animations;
        // Build a map from node index to bone index for each skin
        const skinNodeMaps = [];
        for (const skin of skins) {
            const map = new Map();
            for (let i = 0; i < skin.jointNodeIndices.length; i++) {
                map.set(skin.jointNodeIndices[i], i);
            }
            skinNodeMaps.push(map);
        }
        for (let animIndex = 0; animIndex < gltf.animations.length; animIndex++) {
            const animDef = gltf.animations[animIndex];
            // Parse samplers
            const samplers = [];
            for (const samplerDef of animDef.samplers) {
                const inputData = this._getAccessorData(gltf, samplerDef.input, buffers);
                const outputData = this._getAccessorData(gltf, samplerDef.output, buffers);
                // Determine component count from output accessor
                const outputAccessor = gltf.accessors[samplerDef.output];
                const componentCount = GLTF_TYPE_SIZES[outputAccessor.type];
                samplers.push({
                    input: inputData,
                    output: outputData,
                    interpolation: (samplerDef.interpolation || "LINEAR"),
                    componentCount
                });
            }
            // Parse channels
            const channels = [];
            for (const channelDef of animDef.channels) {
                const targetNodeIndex = channelDef.target.node;
                const targetPath = channelDef.target.path;
                // Find which bone this node corresponds to
                let targetBoneIndex = -1;
                for (const nodeMap of skinNodeMaps) {
                    if (nodeMap.has(targetNodeIndex)) {
                        targetBoneIndex = nodeMap.get(targetNodeIndex);
                        break;
                    }
                }
                // Skip channels that don't target skeleton bones
                if (targetBoneIndex === -1) {
                    continue;
                }
                channels.push({
                    samplerIndex: channelDef.sampler,
                    targetBoneIndex,
                    targetPath
                });
            }
            // Calculate duration from sampler inputs
            let duration = 0;
            for (const sampler of samplers) {
                const maxTime = sampler.input[sampler.input.length - 1];
                if (maxTime > duration) {
                    duration = maxTime;
                }
            }
            animations.push({
                id: `animation_${animIndex}_${Date.now()}`,
                name: animDef.name || `animation_${animIndex}`,
                duration,
                samplers,
                channels
            });
        }
        return animations;
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
