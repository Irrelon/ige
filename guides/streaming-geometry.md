# Streaming geometry: compact vertices, merged meshes, uploads from workers

How to stream a big static world (a city in 64 m chunks, terrain tiles) without running out of GPU memory or
stuttering as chunks arrive. Four parts work together:

1. **Compact (quantised) vertices.** 16 bytes a vertex instead of 32, on the GPU as well as in the file.
2. **Mesh merging.** A chunk's hundreds of pieces become one mesh per material: a draw or two.
3. **Meshes built in workers.** A worker merges and packs a chunk in the layout the renderer uploads. The main
   thread only copies it to the GPU.
4. **An upload budget.** Chunks reach the GPU a few at a time, so no frame does all the work.

The `src/examples/geometryStreaming` example uses all four. "Measured", below, has what they save.

## Compact vertices

A mesh's vertices are normally 32-bit floats: a position, normal and texture coordinate take 32 bytes. Stored as
16-bit and 8-bit integers they take 16, and the GPU reads them back as floats on the way in.

| Attribute | Float | Quantised | Stored as |
|---|---|---|---|
| Position | 12 bytes | 8 | `snorm16` (and 2 bytes of padding), fitted to the mesh's bounds |
| Normal | 12 | 4 | `snorm8` |
| Texture coordinate | 8 | 4 | `unorm16`, fitted when it's outside 0 to 1 |
| Colour | 16 | 4 | `unorm8` |

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
- Tested with files written to the extension's rules in code (the tests and the example); not yet with `gltfpack`'s
  own output.

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
  by the inverse transpose, so stretched pieces stay lit right. A mirroring matrix flips the piece's winding, so its
  faces still point out with back-face culling on.
- **Attributes.** Normals, texture coordinates and vertex colours are kept when any piece of the material has them.
  Pieces without get an up normal, 0,0, and white (or their `color`).
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
- `renderer.stats()`: `uploads`, `uploadBytes` and `uploadMs` this frame, `uploadsQueued`, and `geometryBytes` (every
  mesh's vertex and index buffers on the GPU, exact).
- With render on demand, frames keep coming while meshes wait.

## Mipmaps for model textures

Textures in glTF files now get mipmaps, so distant surfaces don't shimmer. A sampler whose `minFilter` asks for
mipmaps gets them; one that says `LINEAR` or `NEAREST` gets none; none said, `renderer.modelTextureMipmaps()`
decides (on by default). A flat-colour atlas whose swatches bleed together far away can turn them off:
`renderer.modelTextureMipmaps(false)`. The sampler's wrap and filter modes are used too.

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

## A streaming checklist

- Build chunks in workers with `mergeGeometry(..., { pack: IGE_QUANTISED_ENCODINGS })`; post with
  `geometryTransferables()`.
- Set `renderer.uploadBudget({ bytes, ms })` once.
- Put chunks in by making their entities; call `discardGeometryArrays()` on each mesh.
- Take chunks out with `entity.destroy()` and `renderer.releaseGeometry(mesh)`.
- Watch `stats().uploadMs`, `uploadsQueued` and `geometryBytes`.
