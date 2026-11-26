import { colorSpaceChunk } from "@/engine/shaders/webgl/chunks";

/**
 * Particle fragment shader (IgeParticleSystem3d): texture * particle colour (sRGB-encoded for the screen under
 * IGE_SRGB_OUTPUT, see colorSpaceChunk).
 */
export const particleFragmentShader = `
precision mediump float;

varying vec2 v_uv;
varying vec4 v_color;

uniform sampler2D u_texture;
${colorSpaceChunk}

void main() {
	vec4 color = texture2D(u_texture, v_uv) * v_color;
	if (color.a < 0.004) {
		discard;
	}
#ifdef IGE_SRGB_OUTPUT
	color.rgb = igeLinearToSrgb(color.rgb);
#endif
	gl_FragColor = color;
}
`;
