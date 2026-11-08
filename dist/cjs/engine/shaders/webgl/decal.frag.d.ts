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
export declare const decalFragmentShader = "\nprecision mediump float;\n\nvarying vec2 v_uv;\nvarying vec4 v_color;\nvarying vec3 v_worldPosition;\n\nuniform sampler2D u_texture;\nuniform int u_multiply;\nuniform vec3 u_cameraPosition;\nuniform int u_fogMode;\nuniform float u_fogNear;\nuniform float u_fogFar;\nuniform float u_fogDensity;\n\nvoid main() {\n\tvec4 tex = texture2D(u_texture, v_uv);\n\tfloat alpha = tex.a * v_color.a;\n\n\tif (u_fogMode > 0) {\n\t\tfloat fogDistance = length(v_worldPosition - u_cameraPosition);\n\t\tfloat fogAmount;\n\t\tif (u_fogMode == 1) {\n\t\t\tfogAmount = clamp((fogDistance - u_fogNear) / max(u_fogFar - u_fogNear, 0.0001), 0.0, 1.0);\n\t\t} else {\n\t\t\tfloat fd = u_fogDensity * fogDistance;\n\t\t\tfogAmount = 1.0 - exp(-fd * fd);\n\t\t}\n\t\talpha *= 1.0 - fogAmount;\n\t}\n\n\tif (alpha < 0.004) {\n\t\tdiscard;\n\t}\n\n\tvec3 color = v_color.rgb * tex.rgb;\n\tif (u_multiply == 1) {\n\t\tgl_FragColor = vec4(mix(vec3(1.0), color, alpha), 1.0);\n\t} else {\n\t\tgl_FragColor = vec4(color, alpha);\n\t}\n}\n";
