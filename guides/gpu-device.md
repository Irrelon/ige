# The GPU device (`IgeGpuDevice`)

IGE's renderers draw through one interface, `IgeGpuDevice` (`src/engine/gpu/IgeGpuDevice.ts`). It is shaped like WebGPU and SDL3's GPU API, so the same renderer code runs on:
- WebGL2 in the browser today: `webGl2GpuDevice(gl)`, `src/engine/gpu/IgeWebGl2GpuDevice.ts`;
- a native host later: SDL3 GPU, giving D3D12, Vulkan and Metal (the native plan, phase 0).

On the web nothing changes: the WebGL2 device makes the same GL calls the renderers made themselves, often fewer, because it skips state that's already set.

## The shape

**Resources** are made once and kept:
- **Buffers.** `createBuffer({ size, usage: "vertex" | "index", stream })` and `writeBuffer(buffer, offset, data)`.
  - A frame's instances go up in one write.
  - A `stream` buffer written from 0 gets new storage of the data's size each time, like `bufferData` with `STREAM_DRAW`.
- **Textures.** `createTexture({ width, height, layers?, format, mipmaps?, sampler? })`.
  - Contents go in through `writeTexture` (pixels, rows bottom up), `copyImageToTexture` (a picture the host has, premultiplied if asked) or `copyTargetToTexture` (what's been drawn on a target).
  - `generateMipmaps` makes the smaller levels.
  - `resizeTexture` makes new storage at a new size; the handle stays the same, which suits renderers that grow their targets.
- **Samplers.** A texture carries its own sampling (`sampler`, `setSampler`), as GL textures do. A draw can instead set a sampler of its own (`createSampler`).
- **Shader modules.** `createShaderModule({ vertex, fragment })` takes GLSL ES 3.00 with `layout(location = n)` on vertex inputs.
- **Pipelines.** `createRenderPipeline` takes every fixed state a draw needs:
  - vertex layout (buffers, strides, step modes, attribute formats);
  - topology and culling;
  - blend, colour writes, depth (compare, write, bias) and stencil (compare and ops; the reference is set per pass);
  - a **uniform block** (a list of named members, set as one array of numbers);
  - **texture slots** (named samplers).

**Passes** record the frame:

```ts
const pass = device.beginRenderPass({ color: { target: texture | surface, loadOp: "clear", clearValue: [0, 0, 0, 0] } });
pass.setPipeline(pipeline);
pass.setVertexBuffer(0, quad);
pass.setVertexBuffer(1, instances);
pass.setTexture(0, atlas);
pass.setUniforms(block);   // the pipeline's members, in order
pass.setViewport(x, y, w, h);
pass.draw(4, count, 0, firstInstance);
pass.end();
```

- **Targets.** A target is a texture or a **surface**:
  - the screen: `device.surface()`;
  - a framebuffer a host owns: on WebGL2, `webGl2Surface(device, fbo, w, h)`, or `webGl2CurrentSurface(device)` for whatever's bound.
- **Clearing.** `pass.clear(color, rect?)` clears a rectangle: through a scissor in GL; a native backend draws a quad.
- **Sharing a context.** On WebGL2, other renderers may share the context. `invalidate()` forgets what the device knows of GL's state. `release()` hands the context back as other GL code expects it: no vertex array bound, depth writes on, stencil test and colour writes put back.

## Conventions

These are GL's, whatever the backend:
- Viewports, scissors and copy rectangles are measured from the target's **bottom-left** corner.
- A render target's rows are **bottom up**, so a texture drawn into is sampled with v = 0 at its bottom.
- Clip-space z runs from -1 to 1.

A backend on D3D12, Metal or Vulkan flips y in its cross-compiled shaders and its viewport, and remaps z. The renderers keep their maths.

## How WebGL2 does it (`IgeWebGl2GpuDevice`)

- **Pipelines.** One GL program per shader module, shared by its pipelines (blend variants and the like).
  - A pipeline's fixed state is applied only where it differs from what's set.
  - Vertex layouts are vertex array objects, one per distinct layout, shared by the pipelines that use it.
- **Instances.** A draw's `firstInstance` moves the instance attributes' offset, because WebGL2 has no base instance. An attribute is pointed again only when its buffer or offset changes.
- **Uniforms.** Set member by member, only those whose values changed. The values are the program's own, so they survive `invalidate()`.
- **Textures.** Texture slots are texture units 0, 1, 2… Uploads and copies use the last unit, so they never disturb a draw's bindings. Unbinding a slot (`setTexture(slot, null)`) keeps a texture being drawn into from also being sampled (a feedback loop).
- **Render targets.** Each texture drawn into gets its own framebuffer, made the first time it's a target, with a depth/stencil texture attached when a pass brings one.

## IGE's renderers on it

### ui2 (`src/engine/ui2/render/`)
ui2 is the first renderer moved onto the device; parity covers it fully. What it uses:
- **The UI program.**
  - One instanced pipeline per blend: normal (`one, one-minus-src-alpha`), additive (`one, one`), erase (`zero, one-minus-src-alpha`).
  - With and without a stencil test, for clips of any shape.
  - 16 `float32x4` instance attributes; uniforms `u_resolution`, `u_scale`, `u_offset`, `u_view`; textures: the glyph atlas (a 2D array), the gradient ramp, and a batch's image.
- **The stencil marker.** Colour writes off, stencil `equal` with increment or decrement.
- **Blurs and composites.** Separable Gaussian blur, colour matrices, a drop shadow under or a union of shadows: full-target quads with no blend, reading a texture's smaller levels for wide blurs.
- **Targets.** Layers, the fades and shadow atlases and the blur textures are textures drawn into. The screen or a host's framebuffer is a surface. Backdrops copy from the target (`copyTargetToTexture`).

### The 3D renderer (`src/engine/core/IgeWebGlRenderer.ts`, `src/engine/webgl/`)
Next, after ui2. It needs more than ui2 does:

| Need (GL today) | On the device |
|---|---|
| Depth textures and renderbuffers (`DEPTH_COMPONENT16/24/32F`, `DEPTH24_STENCIL8`) | `depth16unorm`, `depth24plus`, `depth32float`, `depth24plus-stencil8` textures; a pass's `depthStencil` |
| Shadow maps (R32F colour or depth textures, compare samplers, polygon offset) | `r32float` / depth formats, `compare` samplers, pipeline `depth.bias` |
| Front-face culling for shadows, `depthFunc` `LEQUAL`/`LESS`, depth-only passes (`drawBuffers([NONE])`) | `primitive.cullMode`, `depth.compare`, `writeColor: false` |
| MSAA post-process targets (`renderbufferStorageMultisample`) resolved with `blitFramebuffer`; HDR (`RGBA16F`, `EXT_color_buffer_float`) | **To add:** `sampleCount` on textures and a pass's `resolveTarget`. `rgba16float` targets, with a capability flag where they aren't renderable |
| Indexed and instanced meshes (`drawElements(Instanced)`, `UNSIGNED_INT` indices) | `setIndexBuffer` with `uint16` / `uint32` and `drawIndexed` (no base vertex on WebGL2) |
| The bone palette and instance data as float textures (`texSubImage2D`) | `rgba32float` textures, `writeTexture` |
| Picking and screenshots (`readPixels`) | **To add:** `readTarget(target, rect)` returning a promise. Synchronous on WebGL2, mapped later on native |
| WebGL 1 fallback (`preferredWebGlVersion(1)`, `ANGLE_instanced_arrays`, `OES_vertex_array_object`) | Not on the device: WebGL2 only. Keeping WebGL 1 would need a second device; dropping it is the simpler choice |
| Shared state (`IgeWebGlStateManager`, `reset()` after passes) | The device's own state cache; the manager goes |

The two "to add" rows (multisample targets and resolve; reading a target back) are the only interface additions the 3D renderer needs. They come with its port.

## Native backends

| Device | SDL3 GPU |
|---|---|
| `createBuffer` / `writeBuffer` | `SDL_CreateGPUBuffer`; transfer buffer plus copy pass (`SDL_UploadToGPUBuffer`). A streamed buffer cycles (`cycle = true`) |
| `createTexture` / `writeTexture` / `copyImageToTexture` | `SDL_CreateGPUTexture`, `SDL_UploadToGPUTexture` (the host decodes pictures itself) |
| `copyTargetToTexture` | `SDL_CopyGPUTextureToTexture`, or a blit (`SDL_BlitGPUTexture`) |
| `generateMipmaps` | `SDL_GenerateMipmapsForGPUTexture` |
| `createShaderModule` | GLSL to SPIR-V (glslang) at build time, then SDL_shadercross to DXIL or MSL; two `SDL_GPUShader`s |
| `createRenderPipeline` | `SDL_CreateGPUGraphicsPipeline`: vertex input, rasterizer, blend, depth/stencil, target formats (a pipeline per target format, made as first needed) |
| `beginRenderPass` / `end` | `SDL_BeginGPURenderPass` with load ops; `SDL_EndGPURenderPass` |
| `setVertexBuffer`, `setTexture`, `setUniforms` | `SDL_BindGPUVertexBuffers`, `SDL_BindGPUFragmentSamplers`, `SDL_PushGPUVertexUniformData` / `SDL_PushGPUFragmentUniformData` (the block std140-packed) |
| `draw(…, firstInstance)` | `SDL_DrawGPUPrimitives` (base instance native) |
| `clear(color, rect)` | A quad with a "replace" pipeline (SDL GPU clears only at a pass's start) |
| `setStencilReference` | `SDL_SetGPUStencilReference` |
| Conventions (GL's) | y flipped in shaders (shadercross option) and viewports; z remapped |

## Status

- Done: the interface, the WebGL2 device and its tests (`src/tests/gpuWebGl2Device.test.ts`).
- In progress: ui2's renderer moving onto it.
- Next: the 3D renderer, then the native SDL3 device in the desktop host.
