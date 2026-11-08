/**
 * Decal fragment shader (IgeDecalSystem3d).
 *
 * Multiply mode (blendFunc DST_COLOR, ZERO) darkens and tints whatever is
 * already on the ground, so stains pick up the floor's own lighting and
 * shadows without being lit themselves: the output is white where the decal
 * is transparent and the decal colour where it is opaque. Normal mode is
 * ordinary alpha blending. Both fade out with distance fog so decals don't
 * show through it.
 */
export const decalFragmentShader = `
precision mediump float;

varying vec2 v_uv;
varying vec4 v_color;
varying vec3 v_worldPosition;

uniform sampler2D u_texture;
uniform int u_multiply;
uniform vec3 u_cameraPosition;
uniform int u_fogMode;
uniform float u_fogNear;
uniform float u_fogFar;
uniform float u_fogDensity;

void main() {
	vec4 tex = texture2D(u_texture, v_uv);
	float alpha = tex.a * v_color.a;

	if (u_fogMode > 0) {
		float fogDistance = length(v_worldPosition - u_cameraPosition);
		float fogAmount;
		if (u_fogMode == 1) {
			fogAmount = clamp((fogDistance - u_fogNear) / max(u_fogFar - u_fogNear, 0.0001), 0.0, 1.0);
		} else {
			float fd = u_fogDensity * fogDistance;
			fogAmount = 1.0 - exp(-fd * fd);
		}
		alpha *= 1.0 - fogAmount;
	}

	if (alpha < 0.004) {
		discard;
	}

	vec3 color = v_color.rgb * tex.rgb;
	if (u_multiply == 1) {
		gl_FragColor = vec4(mix(vec3(1.0), color, alpha), 1.0);
	} else {
		gl_FragColor = vec4(color, alpha);
	}
}
`;
