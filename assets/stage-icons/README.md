# Stage icons

The approved rounded-mat climbing icon is supplied as transparent WebP artwork.

- `active-*`: gold mat; `cleared-*`: sage mat; `unplayed-*`: gray-blue mat.
- Suffixes `100`, `125`, `150` identify wall height variants.
- The six forms combine these three heights with CSS horizontal mirroring.
- Stage numbers are upright DOM text, outside the mirrored artwork.
- Image placement uses alpha bounds to align mat size and floor position across variants.

Created with the built-in image generation tool from the approved icon. Prompt set:
preserve the elliptical padded mat, rearward wall base, five holds and exterior-only
outline; change only wall height (1 / 1.25 / 1.5) and mat palette (gold / sage / gray-blue),
with a transparent background and no numbers. Mirroring is performed at display time.
