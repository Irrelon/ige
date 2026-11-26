# Linear lighting

A paved square seen at a grazing angle, a row of PBR spheres (plastics, greys and metals, their colours given in hex
as a game gives them), the Khronos "SciFi Helmet", three coloured lights, stains on the paving and a small fire, to
compare the two texture and colour settings of IGE's WebGL renderer. See `guides/textures-and-colour.md`.

Keys: **L** linear lighting on / off, **A** anisotropic filtering off / 4x / 16x, **P** post-processing (ACES tone
mapping and a little bloom) on / off, **V** the grazing view or the view from above.

- Linear lighting (`renderer.linearLighting(true)`): the paving's and the helmet's colour maps are decoded from sRGB by
  the GPU, every colour given is converted to linear light, the lighting is done in linear light and the result is
  encoded once (in the post-processing's composite, or at the end of each shader without it). The look is tuned with
  it on; off shows the same numbers lit the old way.
- Anisotropic filtering (`renderer.anisotropy(16)`): the paving's joints stay sharp far ahead instead of blurring.
- The readout shows the texture memory by kind (colour, normal and other maps).
- URL options for stills: `?linear=0`, `?aniso=1` (or 4, 16), `?post=0`, `?view=above`, `?helmet=0`, `?still=1` (the
  fire held at one moment).

## Credits

- The paving is drawn in code (no image to license).
- `src/assets/models/SciFiHelmet.glb`: "SciFi Helmet", (c) 2017 Michael Pavlovic, converted to glTF by Norbert Nopper,
  [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/legalcode), from the
  [Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SciFiHelmet) (see
  `src/examples/pbrMaps/README.md` for how the .glb was packed).
