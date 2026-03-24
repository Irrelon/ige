"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pointShadowFragmentShader = void 0;
/**
 * Point light shadow map fragment shader.
 * Writes linear distance from the fragment to the light, normalized by far plane.
 */
exports.pointShadowFragmentShader = `
precision highp float;

varying vec3 v_worldPosition;

uniform vec3 u_pointLightPosition;   // World position of the point light
uniform float u_pointShadowFarPlane; // Far plane

void main() {
	float depth = length(v_worldPosition - u_pointLightPosition) / u_pointShadowFarPlane;
	gl_FragColor = vec4(depth, 0.0, 0.0, 1.0);
}
`;
