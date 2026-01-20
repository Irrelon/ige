import { IgeBaseClass } from "../core/IgeBaseClass.js"
/**
 * Wrapper class for WebGL shader programs.
 * Provides convenient methods for setting uniforms and caching uniform locations.
 */
export class IgeWebGlProgram extends IgeBaseClass {
    classId = "IgeWebGlProgram";
    _gl;
    _program;
    _uniformLocations = new Map();
    _attributeLocations = new Map();
    constructor(gl, program) {
        super();
        this._gl = gl;
        this._program = program;
    }
    /**
     * Get the underlying WebGL program.
     */
    get program() {
        return this._program;
    }
    /**
     * Use this program for rendering.
     */
    use() {
        this._gl.useProgram(this._program);
        return this;
    }
    /**
     * Get uniform location with caching.
     */
    getUniformLocation(name) {
        if (this._uniformLocations.has(name)) {
            return this._uniformLocations.get(name) || null;
        }
        const location = this._gl.getUniformLocation(this._program, name);
        this._uniformLocations.set(name, location);
        return location;
    }
    /**
     * Get attribute location with caching.
     */
    getAttributeLocation(name) {
        if (this._attributeLocations.has(name)) {
            return this._attributeLocations.get(name) ?? -1;
        }
        const location = this._gl.getAttribLocation(this._program, name);
        this._attributeLocations.set(name, location);
        return location;
    }
    /**
     * Set a float uniform.
     */
    setUniform1f(name, value) {
        const location = this.getUniformLocation(name);
        if (location !== null) {
            this._gl.uniform1f(location, value);
        }
        return this;
    }
    /**
     * Set a vec2 uniform.
     */
    setUniform2f(name, x, y) {
        const location = this.getUniformLocation(name);
        if (location !== null) {
            this._gl.uniform2f(location, x, y);
        }
        return this;
    }
    /**
     * Set a vec3 uniform.
     */
    setUniform3f(name, x, y, z) {
        const location = this.getUniformLocation(name);
        if (location !== null) {
            this._gl.uniform3f(location, x, y, z);
        }
        return this;
    }
    /**
     * Set a vec4 uniform.
     */
    setUniform4f(name, x, y, z, w) {
        const location = this.getUniformLocation(name);
        if (location !== null) {
            this._gl.uniform4f(location, x, y, z, w);
        }
        return this;
    }
    /**
     * Set an int uniform.
     */
    setUniform1i(name, value) {
        const location = this.getUniformLocation(name);
        if (location !== null) {
            this._gl.uniform1i(location, value);
        }
        return this;
    }
    /**
     * Set an ivec2 uniform.
     */
    setUniform2i(name, x, y) {
        const location = this.getUniformLocation(name);
        if (location !== null) {
            this._gl.uniform2i(location, x, y);
        }
        return this;
    }
    /**
     * Set an ivec3 uniform.
     */
    setUniform3i(name, x, y, z) {
        const location = this.getUniformLocation(name);
        if (location !== null) {
            this._gl.uniform3i(location, x, y, z);
        }
        return this;
    }
    /**
     * Set an ivec4 uniform.
     */
    setUniform4i(name, x, y, z, w) {
        const location = this.getUniformLocation(name);
        if (location !== null) {
            this._gl.uniform4i(location, x, y, z, w);
        }
        return this;
    }
    /**
     * Set a mat4 uniform from IgeMatrix4 or Float32Array.
     */
    setUniformMatrix4fv(name, matrix, transpose = false) {
        const location = this.getUniformLocation(name);
        if (location !== null) {
            const data = matrix instanceof Float32Array ? matrix : matrix.matrix;
            this._gl.uniformMatrix4fv(location, transpose, data);
        }
        return this;
    }
    /**
     * Set a float array uniform.
     */
    setUniform1fv(name, values) {
        const location = this.getUniformLocation(name);
        if (location !== null) {
            this._gl.uniform1fv(location, values);
        }
        return this;
    }
    /**
     * Set a vec2 array uniform.
     */
    setUniform2fv(name, values) {
        const location = this.getUniformLocation(name);
        if (location !== null) {
            this._gl.uniform2fv(location, values);
        }
        return this;
    }
    /**
     * Set a vec3 array uniform.
     */
    setUniform3fv(name, values) {
        const location = this.getUniformLocation(name);
        if (location !== null) {
            this._gl.uniform3fv(location, values);
        }
        return this;
    }
    /**
     * Set a vec4 array uniform.
     */
    setUniform4fv(name, values) {
        const location = this.getUniformLocation(name);
        if (location !== null) {
            this._gl.uniform4fv(location, values);
        }
        return this;
    }
    /**
     * Set an int array uniform.
     */
    setUniform1iv(name, values) {
        const location = this.getUniformLocation(name);
        if (location !== null) {
            this._gl.uniform1iv(location, values);
        }
        return this;
    }
    /**
     * Set a texture sampler uniform.
     */
    setTexture(name, texture, textureUnit) {
        const gl = this._gl;
        // Activate texture unit
        gl.activeTexture(gl.TEXTURE0 + textureUnit);
        // Bind texture
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // Set uniform to texture unit
        this.setUniform1i(name, textureUnit);
        return this;
    }
    /**
     * Enable a vertex attribute array.
     */
    enableAttribute(name) {
        const location = this.getAttributeLocation(name);
        if (location !== -1) {
            this._gl.enableVertexAttribArray(location);
        }
        return this;
    }
    /**
     * Disable a vertex attribute array.
     */
    disableAttribute(name) {
        const location = this.getAttributeLocation(name);
        if (location !== -1) {
            this._gl.disableVertexAttribArray(location);
        }
        return this;
    }
    /**
     * Set vertex attribute pointer.
     */
    setAttributePointer(name, size, type, normalized = false, stride = 0, offset = 0) {
        const location = this.getAttributeLocation(name);
        if (location !== -1) {
            this._gl.vertexAttribPointer(location, size, type, normalized, stride, offset);
        }
        return this;
    }
    /**
     * Clear cached uniform and attribute locations.
     * Useful when recompiling the program.
     */
    clearCache() {
        this._uniformLocations.clear();
        this._attributeLocations.clear();
        return this;
    }
}
