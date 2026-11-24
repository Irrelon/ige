# PBR maps

The Khronos "SciFi Helmet" glTF turning slowly under a light, to show the texture maps IGE's WebGL renderer reads from glTF models: normal, metallic-roughness and ambient occlusion (with base colour and emissive).

Keys: **M** maps on/off, **P** PBR lighting on/off, **C** close-up, **Space** pause the turn.

- The normal map works under the default lighting and PBR lighting.
- The metallic-roughness and occlusion maps act only with `renderer.pbr(true)` (off by default).
- URL options for stills: `?maps=0`, `?pbr=1`, `?close=1`, `?spin=0`.

## Model credit

`src/assets/models/SciFiHelmet.glb`: "SciFi Helmet".

- (c) 2017 Michael Pavlovic, [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/legalcode).
- Conversion to glTF: (c) 2017 Norbert Nopper, CC0 1.0.
- From the [Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SciFiHelmet); its LICENSE.md puts every model file under CC0 1.0.
- The Khronos files are a .gltf with four PNG images beside it. The .glb here packs them into one file, with the base colour, metallic-roughness and occlusion images re-encoded as JPEG (quality 92) to keep it to about 13 MB; the normal map stays PNG. The file carries its own tangents.
