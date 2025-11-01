"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeThreeJsRenderer = void 0;
const IgeBaseRenderer_1 = require("./IgeBaseRenderer.js");
const IgeScene2d_1 = require("./IgeScene2d.js");
const maths_1 = require("../utils/maths.js");
const THREE = __importStar(require("three"));
class IgeThreeJsRenderer extends IgeBaseRenderer_1.IgeBaseRenderer {
    constructor() {
        super();
        this.classId = "IgeThreeJsRenderer";
        this._pixelScale = {
            normalDistance: 100,
            fovRadians: 1,
            fovWidth: 1,
            fovHeight: 1,
            pixelWidth: 1,
            pixelHeight: 1
        };
        this._resizeEvent = (event) => {
            this._threeJsCamera.aspect = window.innerWidth / window.innerHeight;
            this._threeJsCamera.updateProjectionMatrix();
            this._updateDevicePixelRatio();
            this._threeJsRenderer.setSize(window.innerWidth, window.innerHeight);
            this._threeJsRenderer.setPixelRatio(this._devicePixelRatio);
            this._recalculatePixelScale();
        };
        this._updateDevicePixelRatio();
        this._threeJsScene = new THREE.Scene();
        this._threeJsCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this._threeJsCamera.position.z = 100;
        this._threeJsCamera.updateProjectionMatrix();
        this._threeJsRenderer = new THREE.WebGLRenderer();
        this._threeJsRenderer.setSize(window.innerWidth, window.innerHeight);
        this._threeJsRenderer.setPixelRatio(this._devicePixelRatio);
        document.body.appendChild(this._threeJsRenderer.domElement);
        this._recalculatePixelScale();
        //const texture = new THREE.TextureLoader().load("./lenna.png");
        //const geometry = new THREE.PlaneGeometry(1, 1);
        //this.normaliseScale(geometry, 100, 100);
        //const material = new THREE.MeshBasicMaterial({ map: texture });
        //const planeMesh = new THREE.Mesh(geometry, material);
        //this._threeJsScene.add(planeMesh);
    }
    _recalculatePixelScale() {
        const viewportDimensions = this._threeJsRenderer.getDrawingBufferSize(new THREE.Vector2());
        this._pixelScale.fovRadians = (this._threeJsCamera.fov * maths_1.PI180); // convert vertical fov to radians
        this._pixelScale.fovHeight = 2 * Math.tan(this._pixelScale.fovRadians / 2) * this._pixelScale.normalDistance; // the height of the visible area at the depth of the plane
        this._pixelScale.fovWidth = this._pixelScale.fovHeight * this._threeJsCamera.aspect; // the width of the visible area at the depth of the plane
        this._pixelScale.pixelWidth = viewportDimensions.width; // in pixels
        this._pixelScale.pixelHeight = viewportDimensions.height; // in pixels
    }
    normaliseScale(mesh, targetWidth, targetHeight) {
        const scaleWidth = this.normaliseX(targetWidth);
        const scaleHeight = this.normaliseY(targetHeight);
        mesh.scale.x = scaleWidth;
        mesh.scale.y = scaleHeight;
    }
    normaliseX(targetX) {
        return (targetX / this._pixelScale.pixelWidth) * this._pixelScale.fovWidth;
    }
    normaliseY(targetY) {
        return (targetY / this._pixelScale.pixelHeight) * this._pixelScale.fovHeight;
    }
    _renderEntities(entityArr) {
        if (!entityArr || !entityArr.length)
            return;
        entityArr.forEach((child) => {
            this._ensureFrameworkInterface(child);
            this._transformObject(child);
            this._renderEntities(child.children());
        });
    }
    renderSceneGraph(engine, viewports) {
        this._threeJsRenderer.render(this._threeJsScene, this._threeJsCamera);
        // Loop viewports
        viewports.forEach((viewport) => {
            // TODO: Set the viewport's clipping and camera
            // Grab the viewport scene and start rendering it
            const scene = viewport.scene();
            // TODO: Create the corresponding three.js scene for the IGE scene
            this._renderEntities(scene.children());
        });
        return true;
    }
    _ensureFrameworkScene(scene) {
        const childGeometryData = scene.geometryData();
        const childMaterialData = scene.materialData();
        if (!childGeometryData)
            return;
        if (!childMaterialData)
            return;
        const mesh = new THREE.Scene();
        this._threeJsScene.add(mesh);
        const newChildMeshData = {
            id: scene.id(),
            meta: {}
        };
        this.setData(newChildMeshData, mesh);
        scene.meshData(newChildMeshData);
    }
    _ensureFrameworkEntity(entity) {
        const childMeshData = entity.meshData();
        const childGeometryData = entity.geometryData();
        const childMaterialData = entity.materialData();
        if (!childGeometryData)
            return;
        if (!childMaterialData)
            return;
        let material = this.getData(childMaterialData);
        if (!material) {
            const finalMaterial = {
                color: childMaterialData.color,
                side: THREE.DoubleSide
            };
            // Create the material
            if (childMaterialData.url) {
                finalMaterial.map = new THREE.TextureLoader().load(childMaterialData.url);
            }
            material = new THREE.MeshBasicMaterial(finalMaterial);
            this.setData(childMaterialData, material);
        }
        let geometry = this.getData(childGeometryData);
        if (!geometry) {
            // Create the geometry
            geometry = new THREE.PlaneGeometry(1, 1);
            this.setData(childGeometryData, geometry);
        }
        if (!childMeshData) {
            // We don't have a defined mesh yet, let's create one
            const mesh = new THREE.Mesh(geometry, material);
            this._threeJsScene.add(mesh);
            const newChildMeshData = {
                id: entity.id(),
                meta: {}
            };
            this.setData(newChildMeshData, mesh);
            entity.meshData(newChildMeshData);
        }
    }
    _ensureFrameworkInterface(obj) {
        const isScene = obj instanceof IgeScene2d_1.IgeScene2d;
        if (isScene) {
            return this._ensureFrameworkScene(obj);
        }
        return this._ensureFrameworkEntity(obj);
    }
    _transformObject(obj) {
        const mesh = this.getData(obj.meshData());
        if (!mesh)
            return;
        if (!obj._aabbDirty)
            return;
        mesh.position.x = this.normaliseX(obj._translate.x);
        mesh.position.y = this.normaliseY(obj._translate.y);
        mesh.position.z = obj._translate.z;
        mesh.rotation.x = obj._rotate.x;
        mesh.rotation.y = obj._rotate.y;
        mesh.rotation.z = obj._rotate.z;
        this.normaliseScale(mesh, obj.width() * obj._scale.x, obj.height() * obj._scale.y);
    }
}
exports.IgeThreeJsRenderer = IgeThreeJsRenderer;
