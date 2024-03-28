import { IgeBaseRenderer } from "@/engine/core/IgeBaseRenderer";
import type { IgeEngine } from "@/engine/core/IgeEngine";
import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeViewport } from "@/engine/core/IgeViewport";
import { PI180 } from "@/engine/utils/maths";
import * as THREE from "three";

export class IgeThreeJsRenderer extends IgeBaseRenderer {
	protected _threeJsRenderer: THREE.WebGLRenderer;
	protected _threeJsScene: THREE.Scene;
	protected _threeJsCamera: THREE.PerspectiveCamera;
	protected _pixelScale = {
		normalDistance: 100,
		fovRadians: 1,
		fovWidth: 1,
		fovHeight: 1,
		pixelWidth: 1,
		pixelHeight: 1
	};

	constructor () {
		super();
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

		const texture = new THREE.TextureLoader().load("./lenna.png");
		const geometry = new THREE.PlaneGeometry(1, 1);
		this.normaliseScale(geometry, 100, 100);

		const material = new THREE.MeshBasicMaterial({ map: texture });
		const planeMesh = new THREE.Mesh(geometry, material);
		this._threeJsScene.add(planeMesh);
	}

	_recalculatePixelScale () {
		const viewportDimensions = this._threeJsRenderer.getDrawingBufferSize(new THREE.Vector2());

		this._pixelScale.fovRadians = (this._threeJsCamera.fov * PI180); // convert vertical fov to radians
		this._pixelScale.fovHeight = 2 * Math.tan(this._pixelScale.fovRadians / 2) * this._pixelScale.normalDistance; // the height of the visible area at the depth of the plane
		this._pixelScale.fovWidth = this._pixelScale.fovHeight * this._threeJsCamera.aspect; // the width of the visible area at the depth of the plane
		this._pixelScale.pixelWidth = viewportDimensions.width; // in pixels
		this._pixelScale.pixelHeight = viewportDimensions.height; // in pixels
	}

	normaliseScale (geometry: THREE.BufferGeometry, targetWidth: number, targetHeight: number) {
		const scaleWidth = (targetWidth / this._pixelScale.pixelWidth) * this._pixelScale.fovWidth;
		const scaleHeight = (targetHeight / this._pixelScale.pixelHeight) * this._pixelScale.fovHeight;

		geometry.scale(scaleWidth, scaleHeight, 1);
	}

	normaliseX (targetX: number) {
		return (targetX / this._pixelScale.pixelWidth) * this._pixelScale.fovWidth;
	}

	normaliseY (targetY: number) {
		return (targetY / this._pixelScale.pixelHeight) * this._pixelScale.fovHeight;
	}

	_resizeEvent = (event?: Event) => {
		this._threeJsCamera.aspect = window.innerWidth / window.innerHeight;
		this._threeJsCamera.updateProjectionMatrix();

		this._updateDevicePixelRatio();
		this._threeJsRenderer.setSize(window.innerWidth, window.innerHeight);
		this._threeJsRenderer.setPixelRatio(this._devicePixelRatio);

		this._recalculatePixelScale();
	};

	renderSceneGraph (engine: IgeEngine, viewports: IgeViewport[]): boolean {
		this._threeJsRenderer.render(this._threeJsScene, this._threeJsCamera);

		// Loop viewports
		viewports.forEach((viewport) => {
			// TODO: Set the viewport's clipping and camera

			// Grab the viewport scene and start rendering it
			const scene = viewport.scene();

			// TODO: Create the corresponding three.js scene for the IGE scene

			(scene.children() as IgeEntity[]).forEach((child) => {
				const childModel = child.model();
				const childMaterial = child.material();

				if (!childModel) return;
				if (!childMaterial) return;

				childMaterial.meta = childMaterial.meta || {};
				if (!childMaterial.meta.three) {
					// Create the material
					const material = new THREE.MeshBasicMaterial({ color: childMaterial.color });
					childMaterial.meta = {
						"three": { material }
					};
				}

				childModel.meta = childModel.meta || {};
				if (!childModel.meta.three) {
					// Create the geometry
					const geometry = new THREE.PlaneGeometry(1, 1);
					const mesh = new THREE.Mesh(geometry, childMaterial.meta.three.material);
					mesh.position.x = this.normaliseX(child._translate.x);
					mesh.position.y = this.normaliseY(child._translate.y);
					mesh.position.z = child._translate.z;

					mesh.rotation.x = child._rotate.x;
					mesh.rotation.y = child._rotate.y;
					mesh.rotation.z = child._rotate.z;

					this.normaliseScale(geometry, child.width() * child._scale.x, child.height() * child._scale.y);
					this._threeJsScene.add(mesh);

					childModel.meta = {
						"three": {
							geometry,
							mesh
						}
					};
				}


			});
		});

		return true;
	}
}
