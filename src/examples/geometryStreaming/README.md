# Geometry streaming example

A generated town streamed in 64 m chunks round a camera flying down its streets: the engine's geometry pipeline
(`guides/streaming-geometry.md`) end to end.

## What it shows

- **A quantised glTF made in code.** `blocks.ts` writes the town's one piece, a block, as a GLB the way `gltfpack`
  writes them (`KHR_mesh_quantization`: 16-bit positions with the node's scale making metres of them, normals as
  bytes, 16-bit texture coordinates) with its atlas embedded as a PNG. The page loads it with `igeGltfLoader.parse()`.
  The bollards along the first street are that model as loaded: instanced, quantised on the GPU, casting shadows, the
  atlas mipmapped as its sampler asks.
- **Chunks merged in workers.** Two workers build each chunk: 8 × 8 plots of 8 m, most with a block (a body, windows
  on every floor and side, a roof cap), taller towards the middle of town, and the paving under them. About 55 blocks,
  1,200 pieces and 14,700 triangles a chunk, merged by `mergeGeometry()` into two meshes (the atlas and the paving),
  keeping each piece's vertex colour, its texture coordinates moved into its atlas cell, and its transform.
- **Packed and quantised in the worker.** The meshes come back packed in the renderer's layout (20 bytes a vertex:
  position, normal, texture coordinate and colour; 48 as floats), their buffers transferred. The main thread makes
  the entities and the renderer copies the bytes to the GPU.
- **An upload budget.** `renderer.uploadBudget({ bytes: 1 MB, ms: 2 })`: chunks reach the GPU over the next frames,
  nearest first, and draw once they're there.
- **Walkers.** CesiumMan, skinned and instanced, with its normals, texture coordinates and weights kept compact on the
  GPU (its positions stay float: a skin moves them before the world matrix).

## Switches

| Query | What it does |
|---|---|
| `?mode=before` | The city spike's way: workers send plain float arrays, the main thread packs and uploads each chunk as it's put in (two a frame, within 4 ms), no upload budget |
| `?mode=after` (default) | Packed and quantised in the workers, 1 MB / 2 ms upload budget |
| `?format=quantised\|packed\|arrays` | How the workers send chunks (packed: float32, in the renderer's layout) |
| `?budgetKb=1024&budgetMs=2` | The upload budget (0: none) |
| `?radius=256` | Chunks within this many metres are shown |
| `?walkers=0` | No CesiumMan walkers |
| `?fly=0` | Stay at the start of the route (the walkers and bollards are there) |
| `?bench=1` | Fly the route for 40 s and report frame times, the main thread's chunk and upload work, and the GPU memory the meshes hold (on the page, in the console and in `window.__bench`) |

## Measured

With Chrome's CPU throttled 4× (alternate runs, a busy machine): the main thread's worst frame of chunk work went from
6 to 10 ms (up to 17 ms in busier runs) to 2 to 3 ms, frames over 33 ms from up to 9 a run to none, and the chunks'
GPU memory from 121 MB to 55 MB. The details are in `guides/streaming-geometry.md`, "Measured".

## Running it

Build it with `npx webpack --config ./config/webpack.config.cjs --config-name geometryStreaming`, copy the static
files (`npm run copy-static`), serve `dist/esm` with `Cache-Control: no-store`, and open
`examples/geometryStreaming/index.html?bench=1`. To throttle: DevTools, Performance, CPU 4× slowdown, then reload.
Chrome's throttling slows the page's main thread, not its workers.

## Files

- `blocks.ts`: the town from a seed, the chunk builder (`mergeGeometry()`), and the quantised GLB writer.
- `chunkWorker.ts`: builds chunks off the main thread and transfers their buffers.
- `streamer.ts`: asks for chunks round the camera, puts built ones in, takes far ones out (`releaseGeometry()`).
- `client.ts`: the renderer, lights, the pieces, the route, the HUD and the bench.
