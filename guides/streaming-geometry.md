# Streaming geometry: compact vertices, merged meshes, uploads from workers

How to stream a big static world (a city in 64 m chunks, terrain tiles) without running out of GPU memory or
stuttering as chunks arrive. Four parts work together:

1. **Compact (quantised) vertices.** 16 bytes a vertex instead of 32, on the GPU as well as in the file.
2. **Mesh merging.** A chunk's hundreds of pieces become one mesh per material: a draw or two.
3. **Meshes built in workers.** A worker merges and packs a chunk in the layout the renderer uploads. The main
   thread only copies it to the GPU.
4. **An upload budget.** Chunks reach the GPU a few at a time, so no frame does all the work.

The `src/examples/geometryStreaming` example uses all four. "Measured", below, has what they save. Far away, groups of
chunks are drawn as low-detail proxies (HLOD, `IgeHlod`): "Far away: HLOD", below, and the `hlodCity` example.

## Compact vertices

A mesh's vertices are normally 32-bit floats: a position, normal and texture coordinate take 32 bytes. Stored as
16-bit and 8-bit integers they take 16, and the GPU reads them back as floats on the way in.

| Attribute | Float | Quantised | Stored as |
|---|---|---|---|
| Position | 12 bytes | 8 | `snorm16` (and 2 bytes of padding), fitted to the mesh's bounds |
| Normal | 12 | 4 | `snorm8` |
| Texture coordinate | 8 | 4 | `unorm16`, fitted when it's outside 0 to 1 |
| Colour | 16 | 4 | `unorm8` |
| Tangent (normal-mapped meshes) | 16 | 4 | `snorm8` (its handedness exact) |

A position in 16 bits over a 64 m chunk is 1 mm apart. A normal in 8 bits is within half a degree.

### Quantise a mesh you made

```typescript
import { quantiseGeometry } from "@/engine/webgl/IgeVertexPacking";

const compact = quantiseGeometry(mesh);          // a copy: packed vertices, the same indices, its bounds
chunk.geometry(compact);
```

`quantiseGeometry(mesh, encodings, { keepArrays })` takes the encodings to use (`IGE_QUANTISED_ENCODINGS` by
default) and leaves the float arrays out unless `keepArrays` is true. Without them the mesh draws, culls and casts
shadows as usual, but raycasts, projected decals and physics mesh shapes skip it (as after
`discardGeometryArrays()`). `unpackVertices(compact.packed)` gives the floats back if you need them.

Positions and texture coordinates rarely fit -1 to 1, so they're stored fitted to the mesh's range with a decode
(a scale and an offset). The renderer applies it when it draws: positions through the world matrix (bounds stay in
the mesh's own units), texture coordinates through the material's texture transform. You don't see either.

Skinned meshes keep float positions when they'd need a decode (a skin moves positions before the world matrix),
but their normals, texture coordinates and weights are compact.

### Quantised glTF (KHR_mesh_quantization)

`gltfpack -i city.glb -o city.min.glb` (meshoptimizer) writes positions as 16-bit integers, normals as bytes and
texture coordinates as 16-bit, with the node's transform turning the positions back into metres and a
`KHR_texture_transform` doing the same for texture coordinates. The loader reads these and keeps them compact on the
GPU:

- Normalised and unnormalised 8 and 16-bit positions, normals, texture coordinates, colours and weights; padded
  (strided) attributes; sparse accessors.
- The node's transform is applied as for any model, and `KHR_texture_transform` (offset and scale) becomes the
  material's `uvOffset` and `uvScale`.
- The arrays on the CPU are floats as before (`vertices` holds the stored values: unnormalised shorts as they are,
  normalised ones -1 to 1), so merging, raycasts and physics work on them. The mesh's `vertexEncodings` tells the
  renderer to pack them back into the file's formats when it uploads them.
- `igeGltfLoader.keepQuantised = false` uploads them as floats instead.
- Meshopt-compressed files (`gltfpack -c` or `-cc`: `EXT_meshopt_compression`) are decoded as they load and read the
  same after: see "Smaller files: gltfpack" in [`webgl-models.md`](webgl-models.md).
- Tested with files written to the extension's rules in code, and with `gltfpack`'s own output (a skinned, animated
  character in the tests; a game's city pieces and characters).

When you merge pieces from a quantised model, use each part's `matrix` (its node's transform) in the piece's matrix:
it's what turns the stored values into metres.

```typescript
const part = getModelParts(model).find((p) => p.name === "house_03")!;
pieces.push({ geometry: part.geometryData, matrix: multiply(placement, part.matrix), material: "atlas" });
```

## Merging meshes

`mergeGeometry(pieces, options)` merges placed pieces into one mesh per material. It's plain typed-array code with
no engine or DOM, so it runs in a worker or on the main thread.

```typescript
import { mergeGeometry } from "@/engine/webgl/IgeGeometryMerge";
import { IGE_QUANTISED_ENCODINGS } from "@/engine/webgl/IgeVertexPacking";

const merged = mergeGeometry([
	{ geometry: house, matrix: placeAt(12, 0, 30, quarterTurns), material: "atlas" },
	{ geometry: lamp, matrix: placeAt(14, 0, 26), material: "atlas", color: [1, 0.9, 0.7] },
	{ geometry: pavingMesh, material: "paving" }
], { id: `chunk_${key}`, pack: IGE_QUANTISED_ENCODINGS });
// merged: [{ material: "atlas", geometry, triangles, vertices, pieces }, { material: "paving", ... }]
```

- **Transforms.** Each piece's `matrix` (column-major, like `IgeMatrix4`) moves its positions and turns its normals
  by the inverse transpose, so stretched pieces stay lit right. Tangents turn with the matrix itself. A mirroring matrix flips the piece's winding, so its
  faces still point out with back-face culling on.
- **Attributes.** Normals, texture coordinates and vertex colours are kept when any piece of the material has them.
  Pieces without get an up normal, 0,0, and white (or their `color`). Tangents (for normal maps) are kept when every
  piece has them; when only some do, the merged mesh's are made afresh (`igeComputeTangents()`).
- **Indices** are offset per piece, and 16-bit when the mesh has 65,535 vertices or fewer.
- **Bounds.** Each mesh has its box and sphere, for culling.
- **Per-piece hooks.** `uvTransform: { scale, offset }` moves a piece's texture coordinates into its cell of an atlas.
  `triangle(a, b, c)` is called for each triangle: return `false` to drop it, or `[u, v]` to point all three corners
  at one spot on the atlas (a flat colour swatch; those corners get vertices of their own).
- **Packed output.** With `pack`, each mesh comes back packed (`geometry.packed`) in those encodings, ready to upload:
  `IGE_QUANTISED_ENCODINGS` for compact vertices, `{}` for floats. `keepArrays: true` keeps the float arrays too.
- **Material keys** can be anything: a name in a worker, the material object itself on the main thread.

## Meshes from workers

A worker can build a chunk's meshes and hand them over finished. `IgeGeometryData3d.packed` is the vertices already
interleaved in the renderer's layout. The renderer uploads it as it is: the main thread does no packing, only the
copy into GPU memory. Post it with `geometryTransferables()` so its buffers move rather than copy.

```typescript
// chunkWorker.ts
import { mergeGeometry } from "@/engine/webgl/IgeGeometryMerge";
import { geometryTransferables, IGE_QUANTISED_ENCODINGS } from "@/engine/webgl/IgeVertexPacking";

onmessage = ({ data }) => {
	const meshes = mergeGeometry(piecesOf(data.key), { id: `chunk_${data.key}`, pack: IGE_QUANTISED_ENCODINGS });
	postMessage({ key: data.key, meshes }, meshes.flatMap((m) => geometryTransferables(m.geometry)));
};

// main thread
worker.onmessage = ({ data }) => {
	for (const m of data.meshes) {
		new IgeEntity().geometry(m.geometry).material(materials[m.material]).mount(chunkRoot);
		renderer.discardGeometryArrays(m.geometry); // only the GPU copy kept, once it's uploaded
	}
};
```

`packVertices(arrays, encodings)` packs any arrays the same way; `packed` has the bytes (`data`, an `ArrayBuffer`),
the `stride`, the vertex `count`, the `attributes` (name, GPU format, offset) and any decode. `IgeGeometryMerge` and
`IgeVertexPacking` import nothing else of the engine's, so a worker that imports them stays small.

## Spreading uploads across frames

```typescript
renderer.uploadBudget({ bytes: 1024 * 1024, ms: 2 }); // at most 1 MB or 2 ms of uploads a frame
```

With a budget, meshes over it wait for the next frames, in the order asked. The first upload of a frame always goes,
so a mesh bigger than the budget still gets there. The time budget is kept by predicting each upload's time from the
bytes per millisecond measured so far. Unlimited is the default (meshes upload when first drawn, as before).

- **While a mesh waits, its entity isn't drawn.** An entity whose mesh was swapped (`entity.geometry(newMesh)`, a
  chunk stepping up a level) draws the one it had while the new one waits, if that's still on the GPU. A model is
  drawn once all its parts are up.
- `discardGeometryArrays(mesh)` on a waiting mesh frees its arrays once it's up.
- `releaseGeometry(mesh)` on a waiting mesh calls its upload off.
- `renderer.uploadGeometry(mesh, { priority, discardArrays })` puts a mesh in the queue before anything draws it, and
  resolves `true` once it's on the GPU (`false` if released first). Lower priorities go first: pass the distance to
  the camera to upload the nearest chunks first.
- `renderer.geometryUploaded(mesh)` says whether it's there.
- `renderer.stats()`: `uploads`, `uploadBytes` and `uploadMs` this frame, `uploadsQueued`, and `gpuMemory.geometry`
  (every mesh's vertex and index buffers on the GPU, exact).
- With render on demand, frames keep coming while meshes wait.

## Mipmaps for model textures

Textures in glTF files get mipmaps when they ask for them, so distant surfaces don't shimmer. A sampler whose
`minFilter` asks for mipmaps gets them; one that says `LINEAR` or `NEAREST` gets none; none said,
`renderer.modelTextureMipmaps()` decides (off by default, as before, since a flat-colour atlas's swatches bleed together
far away; `renderer.modelTextureMipmaps(true)` turns them on). Normal, metallic-roughness and occlusion maps always
have them. The sampler's wrap and filter modes are used too.

## Measured

The `geometryStreaming` example's 40 s flight (`?bench=1`): a camera at 30 m/s down two streets of a generated town,
chunks within 256 m shown, about 167 chunks built a run (55 blocks and 14,700 triangles each). A Chrome of its own,
CPU throttled 4× (the page's main thread; not its workers), on the dev Mac while other work loaded it heavily (load
averages of 100 to 460), so compare runs with each other, not with a quiet machine. Alternate runs, before and after:

| | Before (2 runs) | After (2 runs) |
|---|---|---|
| How | Workers merge into float arrays; the main thread packs and uploads each chunk as it's put in (two a frame, within 4 ms) | Workers merge, pack and quantise; 1 MB / 2 ms upload budget |
| Main thread's chunk work, worst frame | 9.6, 6.3 ms | 3.1, 1.9 ms |
| Of which uploading, worst frame | 7.4, 5.5 ms | 2.6, 1.1 ms |
| Frame p95 / p99 | 19.3 / 24.6, 18.9 / 21.7 ms | 18.5 / 20.4, 18.1 / 19.4 ms |
| Worst frame | 33.4, 28.5 ms | 32.7, 27.9 ms |
| Frames over 33 ms in 40 s | 1, 0 | 0, 0 |
| Chunk meshes on the GPU, at most | 121, 122 MB | 55.2, 55.2 MB |

- Two earlier "before" runs, with the machine busier still, had up to 16.7 ms of chunk work in a frame (12 ms of it
  uploading), a worst frame of 43.7 ms and 9 frames over 33 ms.
- **Quantising saved 55% of the chunks' GPU memory**: 121 MB to 55 MB. The example's vertices have colours (48 bytes
  to 20); the city spike's layout, without them, goes from 32 bytes to 16. Packing in the workers as floats, with the
  budget, held 120.8 MB.
- **Uploading is a copy now**: with quantised chunks (about 450 kB each) a frame's uploads took 2.6 ms at most at 4×
  throttling; with float chunks packed in the workers (1.4 MB each), 4.5 ms. The rest of the old way's time was
  packing on the main thread.
- The worst frames left (about 28 to 33 ms) aren't chunk work: they come and go with the machine's other load.
- CesiumMan, skinned, takes 44 bytes a vertex with compact normals, texture coordinates and weights, instead of 64.

## Far away: HLOD

`IgeHlod` (hierarchical level of detail) draws a big world's distant chunks as groups: 2 x 2 chunks as one low-detail
proxy, then 4 x 4, 8 x 8 and so on, each one draw, so a city can be seen whole from a street, a rooftop or an
aircraft. The example `hlodCity` is a 10 km city of 64 m chunks (25,600 of them, 11,000 triangles each at full
detail) flown from street level to 4 km up.

```typescript
import { IgeHlod } from "@/engine/webgl/IgeHlod";

const hlod = new IgeHlod({
	cellSize: 64,                              // a chunk (level 0)
	cells: { x: 160, z: 160 },                 // the world, in chunks; origin defaults to 0, 0
	minY: 0, maxY: 170,                        // the heights its content spans
	levels: [                                  // level 1 (2 x 2 chunks) upwards
		{ distance: 300 }, { distance: 600 }, { distance: 1200 }, { distance: 2400 }, { distance: 4800 }
	],
	maxDistance: 12000,                        // nothing beyond (put the fog's end here)
	load: (node, signal) => buildInWorker(node) // a chunk (level 0) or a group's proxy
}).mount(scene);
```

- **The cut.** The chunks are a quadtree's leaves. Each frame (its `preUpdate` behaviour, for the viewports showing
  its scene) IgeHlod picks a cut through the tree: a group nearer the camera than its level's `distance` is replaced
  by its four children, and so on down to the chunks. Each level can be given a `screenSize` instead (device pixels
  across a group's box under which it's used), which also works for orthographic cameras. With split screen, the
  nearest camera decides.
- **No holes, no flicker.** A group is split only once all its children are ready (it stays drawn meanwhile); a
  group's children stay drawn until the group is ready. A level is taken up 10% closer than its threshold and let go
  10% further (`hysteresis`).
- **Cross-fades.** The old level and the new one fade over `fade` seconds (0.3): each pixel drawn by one or the other
  through the same dither (`IgeObject._lodFade`, the `lit_fade` program), so nothing is blended or sorted and the
  rest of the scene's draws pay nothing. `fade: 0` swaps at once.
- **Content.** `load(node, signal)` returns (or resolves to) an entity (mounted under the IgeHlod entity: keep it at
  the origin), `{ meshes: [{ geometry, material }], castShadow }` (IgeHlod makes the entities and releases the meshes
  when it lets the node go), or `null` (nothing there). `node` has its `level`, `x`, `z`, `key` and the chunks it
  covers (`cells`) and its box. The load is aborted (`signal`) if the node isn't wanted before it's done.
- **Loading.** The nodes of the cut load nearest first, `concurrency` (4) at a time, and their parents ahead of need
  (`prefetch`, 1 level), so flying up finds the groups ready. A node's meshes reach the GPU (in the renderer's
  `uploadBudget()`) before it's drawn; `discardArrays: true` frees their CPU copies once they're up.
- **Letting go.** What's left the cut is kept `keep` seconds (10), then let go: entities destroyed, meshes released,
  `unload(node, content)` called (free an entity's meshes there).
- **From high up, raise the camera's near plane.** A 24-bit depth buffer tells depths apart in steps of about
  d² / (near × 2^24): with a 1 m near plane, surfaces 4 km away need to be more than a metre apart, and roofs and
  ledges closer than that shimmer as the camera moves. The example sets the near plane to half the camera's height
  above the tallest roof (`cameraNear()` in `hlodCity/city.ts`): nothing in view is nearer than that. Before the fix
  a sideways nudge of 25 cm at 4 km up changed 2.2% of the picture's pixels; after, 0.1% (the edges' own aliasing).
- `hlod.stats()`: nodes drawn per level, fading, loaded, loading, loads, unloads, and `holes` (chunks in range with
  nothing ready to draw them: 0 once settled). `hlod.select(viewpoints)` picks for cameras you give
  (`{ x, y, z, pixelsPerUnit?, orthographic? }`), e.g. a server or a test.

### Building proxies

`igeBuildHlodProxy(pieces, options)` (`IgeHlodBuilder`) builds a group's proxy from its chunks' pieces (the pieces
`mergeGeometry()` takes: the chunks' own pieces, their merged meshes, or the proxies of the level below). Like
`mergeGeometry()` it's plain typed-array code: run it in a worker and post the meshes back with
`geometryTransferables()`.

```typescript
// hlodWorker.ts: a group of chunks to 2^level x 0.5 m
const error = 0.5 * Math.pow(2, level);
const proxies = igeBuildHlodProxy(piecesOf(level, x, z), {
	id: `hlod_${level}_${x}_${z}`, error, heightError: error / 4,
	material: () => "city",                  // every piece into one mesh: one draw
	pack: IGE_QUANTISED_ENCODINGS
});
postMessage(proxies, proxies.flatMap((p) => geometryTransferables(p.geometry)));
```

1. **Merged** into one mesh per material; `material` maps the pieces' materials onto the proxy's (all onto one key
   for one draw: an atlas's swatches, or vertex colours, keep the colours apart).
2. **Small parts dropped**: parts under `minSize` (default `error`) across in two directions, so dots and lines
   (bollards, posts, ledges, window frames) but not walls. Parts are found by the triangles that share corners.
3. **Simplified** to `error`. `"cluster"` (the default) snaps every corner to a grid of cells `error` across and
   `heightError` tall (offset half a cell, so ground at 0 stays in one row), keeps each triangle with three corners
   left (once), flat-shades them and keeps each corner's texture coordinate and colour. Flat faces (roofs, floors,
   the ground) keep their own height and only their outlines are snapped, so flat faces stacked within a row of
   cells (a roof slab on a building's top) stay apart instead of ending up in one plane, where they'd fight for the
   same pixels and shimmer as the camera moves. It's fast and goes on
   reducing where pieces touch or overlap. `"collapse"` is the engine's quadric edge-collapse simplifier
   (`IgeMeshSimplifier`): it keeps topology and seams, but stops at small closed parts (a box stays 12 triangles).
4. **Packed** if asked (quantised, ready to upload).

Each proxy mesh says how many triangles it has (`triangles`), had (`sourceTriangles`) and how many parts were dropped.
Skipping what a level would drop anyway before merging (a generator knows its windows' size) saves building it: the
example leaves windows and ledges out of every proxy.

The example's numbers, for a sense of scale: a chunk is 11,100 triangles and builds in about 4 ms in a worker; a 2 x 2
proxy is 930 triangles (from 44,000), 4 x 4 3,700, 8 x 8 5,600, 16 x 16 21,000 and 32 x 32 58,000 (from 11 million),
building in 3, 9, 19, 76 and 250 ms. A game would bake its far levels ahead of time, or keep them once built, rather
than build a 32 x 32 group from its chunks while flying.

## A streaming checklist

- Build chunks in workers with `mergeGeometry(..., { pack: IGE_QUANTISED_ENCODINGS })`; post with
  `geometryTransferables()`.
- Set `renderer.uploadBudget({ bytes, ms })` once.
- Put chunks in by making their entities; call `discardGeometryArrays()` on each mesh.
- Take chunks out with `entity.destroy()` and `renderer.releaseGeometry(mesh)`.
- Watch `stats().uploadMs`, `uploadsQueued` and `gpuMemory.geometry`.
- Far off, draw groups of chunks as proxies with `IgeHlod` (above): it asks for chunks and proxies as it needs them,
  so the game's own streamer can become its `load()`.
