/**
 * Projected decal vertex shader (IgeDecalSystem3d.project()). The decal
 * triangles are already in world space with atlas UVs and a per-vertex
 * colour (alpha includes the fade); the fragment shader is the flat
 * decals' one.
 */
export declare const decalMeshVertexShader = "\nprecision highp float;\n\nattribute vec3 a_position;\nattribute vec2 a_uv;\nattribute vec4 a_color;\n\nuniform mat4 u_viewMatrix;\nuniform mat4 u_projectionMatrix;\n\nvarying vec2 v_uv;\nvarying vec4 v_color;\nvarying vec3 v_worldPosition;\n\nvoid main() {\n\tv_uv = a_uv;\n\tv_color = a_color;\n\tv_worldPosition = a_position;\n\tgl_Position = u_projectionMatrix * u_viewMatrix * vec4(a_position, 1.0);\n}\n";
