/**
 * Debug line vertex shader: world-space line vertices with a colour each
 * (see IgeWebGlRenderer.debugLine() and debugDraw()).
 */
export declare const debugLineVertexShader = "\nprecision highp float;\n\nattribute vec3 a_position;\nattribute vec4 a_color;\n\nuniform mat4 u_viewMatrix;\nuniform mat4 u_projectionMatrix;\n\nvarying vec4 v_color;\n\nvoid main() {\n\tv_color = a_color;\n\tgl_Position = u_projectionMatrix * u_viewMatrix * vec4(a_position, 1.0);\n}\n";
