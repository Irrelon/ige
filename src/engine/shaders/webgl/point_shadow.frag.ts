/**
 * Point light shadow map fragment shader (VSM - Variance Shadow Maps).
 * Writes linear distance in R channel and distance² in G channel.
 * The atlas is later blurred with a Gaussian pass to produce soft shadows.
 */
export const pointShadowFragmentShader = `
precision highp float;

varying vec3 v_worldPosition;

uniform vec3 u_pointLightPosition;   // World position of the point light
uniform float u_pointShadowFarPlane; // Far plane

void main() {
	// Calculate linear distance from fragment to light, normalized to [0, 1]
	float depth = length(v_worldPosition - u_pointLightPosition) / u_pointShadowFarPlane;

	// VSM: store depth in R, depth² in G (for variance calculation)
	gl_FragColor = vec4(depth, depth * depth, 0.0, 1.0);
}
`;
