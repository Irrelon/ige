import { IgeBaseClass } from "../core/IgeBaseClass.js"
import { IgeLightType } from "./IgeWebGlLight.js";
/**
 * Maximum number of each light type supported by the shader.
 */
const MAX_POINT_LIGHTS = 8;
const MAX_SPOT_LIGHTS = 4;
/**
 * Manages lights for WebGL rendering.
 * Tracks all active lights and provides methods to update shader uniforms.
 */
export class IgeWebGlLightManager extends IgeBaseClass {
    classId = "IgeWebGlLightManager";
    // Tracked lights
    _ambientLights = [];
    _directionalLights = [];
    _pointLights = [];
    _spotLights = [];
    // Combined ambient color
    _combinedAmbient = {
        r: 0.1,
        g: 0.1,
        b: 0.1,
        intensity: 1.0
    };
    /**
     * Add a light to be tracked.
     */
    addLight(light) {
        const type = light.lightType();
        switch (type) {
            case IgeLightType.Ambient:
                if (!this._ambientLights.includes(light)) {
                    this._ambientLights.push(light);
                    this._updateCombinedAmbient();
                }
                break;
            case IgeLightType.Directional:
                if (!this._directionalLights.includes(light)) {
                    this._directionalLights.push(light);
                }
                break;
            case IgeLightType.Point:
                if (this._pointLights.length < MAX_POINT_LIGHTS &&
                    !this._pointLights.includes(light)) {
                    this._pointLights.push(light);
                }
                else if (this._pointLights.length >= MAX_POINT_LIGHTS) {
                    this.log(`Maximum point lights (${MAX_POINT_LIGHTS}) reached`, "warning");
                }
                break;
            case IgeLightType.Spot:
                if (this._spotLights.length < MAX_SPOT_LIGHTS &&
                    !this._spotLights.includes(light)) {
                    this._spotLights.push(light);
                }
                else if (this._spotLights.length >= MAX_SPOT_LIGHTS) {
                    this.log(`Maximum spot lights (${MAX_SPOT_LIGHTS}) reached`, "warning");
                }
                break;
        }
    }
    /**
     * Remove a light from tracking.
     */
    removeLight(light) {
        const type = light.lightType();
        switch (type) {
            case IgeLightType.Ambient:
                const ambientIndex = this._ambientLights.indexOf(light);
                if (ambientIndex > -1) {
                    this._ambientLights.splice(ambientIndex, 1);
                    this._updateCombinedAmbient();
                }
                break;
            case IgeLightType.Directional:
                const dirIndex = this._directionalLights.indexOf(light);
                if (dirIndex > -1) {
                    this._directionalLights.splice(dirIndex, 1);
                }
                break;
            case IgeLightType.Point:
                const pointIndex = this._pointLights.indexOf(light);
                if (pointIndex > -1) {
                    this._pointLights.splice(pointIndex, 1);
                }
                break;
            case IgeLightType.Spot:
                const spotIndex = this._spotLights.indexOf(light);
                if (spotIndex > -1) {
                    this._spotLights.splice(spotIndex, 1);
                }
                break;
        }
    }
    /**
     * Update combined ambient light from all ambient light sources.
     */
    _updateCombinedAmbient() {
        let r = 0, g = 0, b = 0;
        for (const light of this._ambientLights) {
            const data = light.getLightData();
            const intensity = data.intensity;
            r += data.color.r * intensity;
            g += data.color.g * intensity;
            b += data.color.b * intensity;
        }
        // If no ambient lights, no ambient contribution (fully dark)
        // Use setDefaultAmbient() to override this if desired
        this._combinedAmbient = { r, g, b, intensity: 1.0 };
    }
    /**
     * Set a default ambient light level.
     */
    setDefaultAmbient(r, g, b) {
        if (this._ambientLights.length === 0) {
            this._combinedAmbient = { r, g, b, intensity: 1.0 };
        }
    }
    /**
     * Apply all light uniforms to a shader program.
     */
    applyLightUniforms(program) {
        // Ambient light
        program.setUniform3f("u_ambientLightColor", this._combinedAmbient.r, this._combinedAmbient.g, this._combinedAmbient.b);
        program.setUniform1f("u_ambientLightIntensity", this._combinedAmbient.intensity);
        // Directional light (use first one if available)
        if (this._directionalLights.length > 0) {
            const dirLight = this._directionalLights[0];
            const data = dirLight.getLightData();
            program.setUniform1i("u_hasDirectionalLight", 1);
            // Direction TO the light (opposite of light direction)
            const dir = data.direction;
            program.setUniform3f("u_directionalLightDir", -dir.x, -dir.y, -dir.z);
            program.setUniform3f("u_directionalLightColor", data.color.r, data.color.g, data.color.b);
            program.setUniform1f("u_directionalLightIntensity", data.intensity);
        }
        else {
            program.setUniform1i("u_hasDirectionalLight", 0);
        }
        // Point lights
        program.setUniform1i("u_numPointLights", this._pointLights.length);
        for (let i = 0; i < this._pointLights.length; i++) {
            const light = this._pointLights[i];
            const data = light.getLightData();
            program.setUniform3f(`u_pointLightPositions[${i}]`, data.position.x, data.position.y, data.position.z);
            program.setUniform3f(`u_pointLightColors[${i}]`, data.color.r, data.color.g, data.color.b);
            program.setUniform1f(`u_pointLightIntensities[${i}]`, data.intensity);
            program.setUniform1f(`u_pointLightRanges[${i}]`, data.range || 100);
            program.setUniform1f(`u_pointLightDecays[${i}]`, data.decay || 2);
        }
        // Spot lights
        program.setUniform1i("u_numSpotLights", this._spotLights.length);
        for (let i = 0; i < this._spotLights.length; i++) {
            const light = this._spotLights[i];
            const data = light.getLightData();
            program.setUniform3f(`u_spotLightPositions[${i}]`, data.position.x, data.position.y, data.position.z);
            const dir = data.direction;
            program.setUniform3f(`u_spotLightDirections[${i}]`, dir.x, dir.y, dir.z);
            program.setUniform3f(`u_spotLightColors[${i}]`, data.color.r, data.color.g, data.color.b);
            program.setUniform1f(`u_spotLightIntensities[${i}]`, data.intensity);
            program.setUniform1f(`u_spotLightRanges[${i}]`, data.range || 100);
            // Convert angle to cosine for shader comparison
            program.setUniform1f(`u_spotLightAngles[${i}]`, Math.cos(data.angle || Math.PI / 4));
            program.setUniform1f(`u_spotLightPenumbras[${i}]`, data.penumbra || 0.1);
        }
    }
    /**
     * Get the number of active lights.
     */
    getLightCount() {
        return {
            ambient: this._ambientLights.length,
            directional: this._directionalLights.length,
            point: this._pointLights.length,
            spot: this._spotLights.length,
            total: this._ambientLights.length + this._directionalLights.length +
                this._pointLights.length + this._spotLights.length
        };
    }
    /**
     * Check if any lights are in the scene.
     */
    hasLights() {
        return this._ambientLights.length > 0 ||
            this._directionalLights.length > 0 ||
            this._pointLights.length > 0 ||
            this._spotLights.length > 0;
    }
    /**
     * Clear all tracked lights.
     */
    clearLights() {
        this._ambientLights = [];
        this._directionalLights = [];
        this._pointLights = [];
        this._spotLights = [];
        this._updateCombinedAmbient();
    }
}
