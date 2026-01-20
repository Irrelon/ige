import { spriteVertexShader } from "@/engine/shaders/webgl/sprite.vert";
import { spriteFragmentShader } from "@/engine/shaders/webgl/sprite.frag";
import { modelVertexShader } from "@/engine/shaders/webgl/model.vert";
import { modelFragmentShader } from "@/engine/shaders/webgl/model.frag";
import { litVertexShader } from "@/engine/shaders/webgl/lit.vert";
import { litFragmentShader } from "@/engine/shaders/webgl/lit.frag";
import { shadowVertexShader } from "@/engine/shaders/webgl/shadow.vert";
import { shadowFragmentShader } from "@/engine/shaders/webgl/shadow.frag";

/**
 * Shader source definition.
 */
export interface IgeShaderSource {
	vertex: string;
	fragment: string;
	description?: string;
}

/**
 * Built-in shader library for WebGL renderer.
 * Provides centralized registration and lookup of shader programs.
 */
export class IgeShaderLibrary {
	protected static _shaders: Map<string, IgeShaderSource> = new Map();

	/**
	 * Register a shader program.
	 */
	static register(id: string, vertexSource: string, fragmentSource: string, description?: string): void {
		this._shaders.set(id, {
			vertex: vertexSource,
			fragment: fragmentSource,
			description
		});
	}

	/**
	 * Get a shader program by id.
	 */
	static get(id: string): IgeShaderSource | undefined {
		return this._shaders.get(id);
	}

	/**
	 * Check if a shader exists.
	 */
	static has(id: string): boolean {
		return this._shaders.has(id);
	}

	/**
	 * Get all registered shader IDs.
	 */
	static getAll(): string[] {
		return Array.from(this._shaders.keys());
	}

	/**
	 * Clear all registered shaders.
	 */
	static clear(): void {
		this._shaders.clear();
	}
}

// Register built-in shaders
IgeShaderLibrary.register(
	"sprite",
	spriteVertexShader,
	spriteFragmentShader,
	"2D sprite shader with billboarding support"
);

IgeShaderLibrary.register(
	"model",
	modelVertexShader,
	modelFragmentShader,
	"Basic 3D model shader with simple lighting"
);

IgeShaderLibrary.register(
	"lit",
	litVertexShader,
	litFragmentShader,
	"PBR lit shader with support for 2D textures, smart textures, and PBR materials"
);

IgeShaderLibrary.register(
	"shadow",
	shadowVertexShader,
	shadowFragmentShader,
	"Shadow depth pass shader for shadow mapping"
);
