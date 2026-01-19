/**
 * Basic 3D model fragment shader with simple ambient lighting.
 * This is a temporary shader for Phase 1; full PBR lighting will be added in Phase 3.
 */
export const modelFragmentShader = `
precision mediump float;

// Varyings
varying vec3 v_worldPosition;
varying vec3 v_worldNormal;
varying vec2 v_uv;

// Uniforms
uniform sampler2D u_texture;    // Base color texture
uniform vec4 u_baseColor;       // Base color tint (default: white)
uniform vec3 u_ambientLight;    // Simple ambient light color
uniform float u_opacity;        // Overall opacity

void main() {
	// Sample texture
	vec4 texColor = texture2D(u_texture, v_uv);

	// Apply base color tint
	vec4 baseColor = texColor * u_baseColor;

	// Simple ambient lighting (will be replaced with PBR in Phase 3)
	vec3 ambient = u_ambientLight * baseColor.rgb;

	// Very basic directional lighting from above (temporary)
	vec3 lightDir = normalize(vec3(0.3, 1.0, 0.5));
	float diff = max(dot(normalize(v_worldNormal), lightDir), 0.0);
	vec3 diffuse = diff * baseColor.rgb * 0.5;

	// Combine lighting
	vec3 finalColor = ambient + diffuse;

	// Apply opacity
	float finalAlpha = baseColor.a * u_opacity;

	// Output final color
	gl_FragColor = vec4(finalColor, finalAlpha);
}
`;
