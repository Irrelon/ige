# Textures and colour (WebGL)

Two renderer settings for realistic, textured art, both off by default so a game looks exactly as it did until it
asks: anisotropic filtering keeps textures sharp where surfaces are seen at a slant, and linear lighting lights
colours the way light really adds up. The renderer also counts texture memory by each texture's real format and mip
chain, split into colour, normal and other maps.

```typescript
const renderer = new IgeWebGlRenderer();
// ...set up as usual, then:
renderer.anisotropy(8);           // sharp roads and floors into the distance (capped at the GPU's most)
renderer.linearLighting(true);    // sRGB colour maps decoded, colours converted, lit in linear light
renderer.pbr(true);               // the lighting model realistic art is made for
renderer.postProcess({ enabled: true, toneMapping: "aces" }); // linear light is encoded once, after tone mapping
```

The `linearLighting` example shows both: a paved square at a grazing angle, PBR spheres, the Khronos SciFi Helmet,
stains and a small fire, with **L** for linear lighting, **A** for anisotropic filtering (off, 4x, 16x), **P** for
post-processing and **V** for the view.

## Anisotropic filtering

A texture seen at a slant, like a road ahead of a car, covers many texels along the road for each pixel and few across
it. Mipmapping picks one smaller copy for both directions, so the road blurs a short way ahead. Anisotropic filtering
takes several samples along the slant instead, and the joints, markings and grain stay sharp.

- `renderer.anisotropy(level)`: up to `level` samples. 1 is off (the default); 4 to 16 are usual. It's capped at what
  the GPU allows, `renderer.maxAnisotropy()` (16 on most desktop GPUs; 1 where `EXT_texture_filter_anisotropic` is
  missing, when the setting does nothing). The getter gives the level in use.
- It applies to **mipmapped** textures, those made already as well as those made after, so it can change at any time
  (a quality setting). On WebGL 2 every `IgeTexture` drawn by the renderer is mipmapped, and so are normal,
  metallic-roughness and occlusion maps and the built-in decal splats. A glTF base colour or emissive texture is
  mipmapped when its sampler asks for it, or for all of them with `renderer.modelTextureMipmaps(true)`; one that
  isn't keeps plain filtering.
- It costs texture reads only where surfaces are at a slant, so it's cheap for what it does. Surfaces facing the
  camera, and 2D sprites, look the same with it on.

## Texture memory

`renderer.stats().gpuMemory` (or `renderer.gpuMemory()`) counts each texture from its format and size, and every level
of its mip chain (down to 1 x 1, not "a third more"):

| Field | What |
|---|---|
| `textures` | Every texture drawn with, as before |
| `colorMaps` | The part of it that holds colours: base colour and emissive maps, sprites, particles, decals, smart textures, UI pictures |
| `normalMaps` | Normal maps |
| `otherMaps` | The rest: metallic-roughness and occlusion maps, the UI's glyph pages, the renderer's own small textures |

The three are parts of `textures`, so `total` doesn't add them again. Compressed formats (BC, ETC2, ASTC) are counted
in whole blocks by `igeTextureBytes()` in `IgeGpuTextureFormats.ts`, ready for when the engine uploads them.

## Linear lighting

Colours as people pick them (hex, CSS, numbers from 0 to 1 by eye, a photo's pixels) are **sRGB**: their numbers follow
how bright they look, not how much light they are. Mid grey, `#808080`, is about a fifth of the light of white.
Lighting adds and multiplies light, so lighting sRGB numbers directly (what the renderer has always done, and still does
with the setting off) makes half-lit surfaces too dark, light falloffs and mixes wrong, and photo textures flat and
washed out. With `renderer.linearLighting(true)`:

1. Colours are **decoded to linear light where they come in**, once.
2. The lighting is done in linear light.
3. The result is **encoded to sRGB once**, for the screen.

### What's decoded, and where

| Colour | How it's decoded |
|---|---|
| Base colour and emissive maps (glTF images and `IgeTexture`s), particle and decal textures | Stored as an sRGB texture (`SRGB8_ALPHA8`); the GPU decodes each texel as it's sampled, before filtering, and the mipmaps are made from decoded colours |
| Material colours and tints (`color`, `emissiveColor`, hex or objects) | On the CPU, as the item's material is resolved each frame |
| Light colours, the hemisphere ambient (sky and ground) | On the CPU, as each view's lights are written (each ambient light's colour before they're added up) |
| Fog colour | On the CPU, per view |
| The clear colour | On the CPU, when the frame goes through post-processing (straight to the screen it's already what's shown) |
| Silhouette colours (`occludedColor()`) | On the CPU, per item |
| Vertex colours, particle and decal colours | In the vertex shader, per vertex (8-bit colours lose their dark shades if decoded before they're packed) |

Not decoded, because they aren't colours or are linear already:

- **Normal, metallic-roughness and occlusion maps** hold numbers, not colours: used as they are.
- **glTF's colour factors** (`baseColorFactor`, `emissiveFactor`) and **vertex colours** (`COLOR_0`) are linear light by
  the glTF spec. The loader marks them (`colorSpace: "linear"` on the material data and on the geometry), so they
  aren't decoded twice. A material override a game gives an entity (`entity.material({ color })`) is the game's own,
  so it's sRGB.

### Where it's encoded

- **With post-processing on**, the scene is drawn into the half-float offscreen frame in linear light. Bloom, depth of
  field, exposure and tone mapping work on linear light (as they're meant to), then the composite encodes it, before
  the contrast, saturation, vignette and dither (so those work on the picture as shown, as they always have). Blending
  of transparent things happens in linear light too. When the offscreen frame is 8-bit (`hdr: false`, or offscreen
  only for the picture effects or dynamic resolution) it's an sRGB target, so dark shades keep their precision.
- **Without post-processing**, each lit, particle, decal and debug-line shader encodes its own result at its end.
  Blending onto the screen then happens on sRGB numbers, as it always has.

### What looks the same either way

Things that aren't lit aren't changed:

- **Sprites and 2D** (`texture()` without a mesh, the `screen2d` camera, bitmap fonts, smart textures). Straight to the
  screen they're drawn exactly as without linear lighting (pixel for pixel). Into post-processing's linear frame each
  sprite's finished colour is decoded after filtering and tinting, so the composite gives it back; only the
  half-transparent edges differ a little, as they blend in linear light there.
- **The UI layer, text labels, outlines, panels' frames, overlays and the document UI** draw over the finished
  picture, unchanged. A picture the UI layer draws is uploaded as it is, even when the same `IgeTexture` is a colour
  map in the scene (it then has two copies on the GPU).
- **Panels** draw their scene the same way as the main view without post-processing (encoded at the end of each
  shader), and their effects work on the picture as shown.

### Saying what a texture or colour is

The renderer knows what a texture is from the slot it fills, so nothing is needed in the usual case. When a game draws
data in a colour slot, or keeps colours that are linear already, it says so:

```typescript
heightPicture.colorSpace("linear");           // an IgeTexture of numbers shown as they are: never decoded
lightmap.colorSpace("srgb");                  // decoded wherever it's used, even in a data slot
entity.material({ color: { r: 0.2, g: 0.4, b: 0.8 }, colorSpace: "linear" }); // colours already linear light
const mesh = { ...myMesh, colorSpace: "linear" };   // vertex colours already linear light
```

`mergeGeometry()` keeps the numbers it's given: the merged mesh is "linear" when every piece's own colours are (glTF
pieces), and sRGB otherwise (a piece's `color` fill is sRGB).

### Retuning a game's look

Turning linear lighting on keeps a surface in full light the colour it was picked, but changes everything in between,
so a game that turns it on retunes its look:

- **Half-lit surfaces get lighter.** A surface in half the light used to be drawn at half its colour's numbers (which
  a screen shows as about a fifth of the light); now it's drawn at about 73% of them (half the light). Every light's
  and the ambient's intensity under 1 so looks stronger: the old intensity to the power 2.2 gives about the old look
  (an ambient of 0.55 becomes about 0.27), and the sun's, near 1, stays. The turn into shadow on a round object looks
  quicker.
- **Saturated colours look more saturated**, and textures less washed out. Material colours picked to look right
  under the old lighting are often too strong: re-pick them by eye with the new lighting on.
- **Lights add up properly.** Two overlapping lights of half strength now look as bright as one at full strength, and a
  red and a green light mix to a bright yellow rather than a dull olive. Point and spot light falloffs look wider;
  lower their ranges or intensities to taste.
- **Bloom's threshold is in linear light** (scene colour, before exposure and tone mapping): 0.9 now means what an
  sRGB 0.95 did. Lower it (0.8 is about 0.9 in sRGB) to bloom what bloomed before.
- **Tone mapping expects linear light**: ACES with exposure 1 to 1.5 is a good start.
- Emissive colours keep their colour at intensity 1; under 1 they look stronger, as lights do.
- **Half-transparent things let more through.** A decal or particle at 90% opacity covers 90% of the light, which in
  linear light shows the floor at about a third of its brightness rather than a tenth: stains look lighter and less
  saturated. Raise their opacity (or darken their colour) to keep their old strength.
- Fog and the clear colour still show the colours given, so a sky colour and the fog matching it keep matching.

A good order: turn on `linearLighting(true)`, `pbr(true)` and ACES tone mapping together; set the sun and the ambient
so a white surface in full sun and in shade both read right; then go through the material colours.

### Switching at run time

`linearLighting()` can be switched while a game runs (a settings menu, a comparison key):

- The lit and effect programs are compiled again for the other setting, once each the first time (a short hitch).
- Colour textures are uploaded again in the other form as they're next drawn: an `IgeTexture` at once (its image is
  kept), a glTF image decoded again from the file's bytes, its old copy drawn meanwhile. The old copy is let go as the
  new one is made, so memory doesn't stay doubled. No material, mesh or model is rebuilt.

### Costs

- **Off**: nothing. The programs are the ones they were (the new code is behind `#define`s), and the picture is pixel
  for pixel the same.
- **On**: one encode a pixel (in the composite with post-processing, else at the end of each lit or effect pixel); a
  decode per vertex for meshes with vertex colours and for particles and decals; a few `Math.pow` a frame per item
  with an sRGB material colour. sRGB textures sample at the same speed and take the same memory.

## In the engine

- `IgeGpuTextureFormats.ts`: formats with their block sizes, sRGB twins and GL constants; `igeTextureBytes()`,
  `igeMipLevels()`, `igeAnisotropyLevel()`. The device has `rgba8unorm-srgb`, `limits.maxAnisotropy` and a sampler's
  `maxAnisotropy`.
- `igeColorSpace.ts`: `igeSrgbToLinear()` and `igeLinearToSrgb()`, the exact sRGB curves (the GPU's).
- `IgeWebGlTextureManager`: a texture's two copies by `igeTextureKey(id, srgb)`, roles for memory
  (`memoryByRole()`), `anisotropy()`.
- Shaders: `colorSpaceChunk` and `igeColorDefines()` in `chunks.ts`; `IgeGpuMeshPrograms.module(id, attributes,
  defines)` compiles a program's variants.
