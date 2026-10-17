# Stage icons

The approved rounded-mat climbing icon is supplied as transparent WebP artwork.

- `active-*`: gold mat; `cleared-*`: sage mat; `unplayed-*`: gray-blue mat.
- Suffixes `100`, `125`, `150` identify wall height variants.
- The six forms combine these three heights with CSS horizontal mirroring.
  Orientation follows the outgoing trail, including at corners.
- Stage numbers are upright white DOM text with a black outline, outside the mirrored artwork.
- Image placement uses alpha bounds to align mat size and floor position across variants.

Created with the built-in image generation tool from the approved icon. Prompt set:
preserve the elliptical padded mat, rearward wall base, five holds and exterior-only
outline; change only wall height (1 / 1.25 / 1.5) and mat palette (gold / sage / gray-blue),
with a transparent background and no numbers. Mirroring is performed at display time.

The exterior outline is recolored white by an SVG display filter, leaving the
black outline of the live white stage number unchanged.

Shading revision: each base material uses a light/dark pair of flat colors, without
gradients or texture. Geometry, six variants and progress palettes are retained.

The final exports use the explicit light/dark pairs in `palette.json` and lossless
WebP compression. Intermediate texture colors are removed at export; transparent
edge alpha remains available for smooth compositing. The background uses the previous approved illustration. Asset URLs include a revision to refresh older cached art.
