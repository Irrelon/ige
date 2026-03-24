"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pointShadowFragmentShader = void 0;
/**
 * Point light shadow map fragment shader.
 * Writes linear distance from the fragment to the light, normalized by far plane.
 * This is stored in the depth buffer via gl_FragDepth (WebGL 2) or packed into
 * RGBA (WebGL 1 fallback).
 */
exports.pointShadowFragmentShader = `
precision highp float;

varying vec3 v_worldPosition;

uniform vec3 u_pointLightPosition;   // World position of the point light
uniform float u_pointShadowFarPlane; // Far plane = light range

void main() {
	// Calculate linear distance from fragment to light
	float lightDistance = length(v_worldPosition - u_pointLightPosition);

	// Normalize to [0, 1] range using far plane
	lightDistance = lightDistance / u_pointShadowFarPlane;

	// Write to depth buffer
	gl_FragColor = vec4(lightDistance, lightDistance, lightDistance, 1.0);
}
`;
