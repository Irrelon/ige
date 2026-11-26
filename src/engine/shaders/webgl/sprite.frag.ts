import { colorSpaceChunk } from "@/engine/shaders/webgl/chunks";

/**
 * Sprite fragment shader for 2D rendering.
 * Supports texture sampling, tint color, and opacity. Sprites aren't lit, so linear lighting leaves them as they are:
 * straight to the screen the program is the one without it, and into post-processing's linear frame (IGE_LINEAR) the
 * finished colour is decoded to linear light, after filtering and tinting as before, for the composite to encode back
 * (2D looks the same either way; see colorSpaceChunk).
 */
export const spriteFragmentShader = `
precision mediump float;

// Varyings
varying vec2 v_uv;

// Uniforms
uniform sampler2D u_texture; // Sprite texture
uniform vec4 u_tint;         // Tint color (r, g, b, a)
uniform float u_opacity;     // Overall opacity (0.0 to 1.0)
${colorSpaceChunk}

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

#ifdef IGE_LINEAR
	finalColor.rgb = igeSrgbToLinear(finalColor.rgb);
#endif
	gl_FragColor = finalColor;
}
`;
