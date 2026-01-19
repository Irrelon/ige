"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spriteFragmentShader = void 0;
/**
 * Sprite fragment shader for 2D rendering.
 * Supports texture sampling, tint color, and opacity.
 */
exports.spriteFragmentShader = `
precision mediump float;

// Varyings
varying vec2 v_uv;

// Uniforms
uniform sampler2D u_texture; // Sprite texture
uniform vec4 u_tint;         // Tint color (r, g, b, a)
uniform float u_opacity;     // Overall opacity (0.0 to 1.0)

void main() {
	// Sample texture
	vec4 texColor = texture2D(u_texture, v_uv);

	// Apply tint color (multiply)
	vec4 finalColor = texColor * u_tint;

	// Apply opacity
	finalColor.a *= u_opacity;

	// Discard fully transparent pixels (optimization)
	if (finalColor.a < 0.01) {
		discard;
	}

	gl_FragColor = finalColor;
}
`;
