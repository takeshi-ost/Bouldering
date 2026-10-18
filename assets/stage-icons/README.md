# Stage icons

The approved horizontal-ellipse mat and white base plate template is exported as
transparent WebP artwork (quality 95, full-quality alpha).

- `active-*`: gold mat; `cleared-*`: sage mat; `unplayed-*`: gray-blue mat.
- Suffixes `100`, `125`, `150` identify the three wall-height forms.
  The map selects them by actual generated wall height: up to one screen,
  between one and two screens, and at least two screens, respectively.
  Preview geometry is shared with generation and requires no route solving.
- CSS horizontal mirroring supplies both facing directions, for six forms and
  eighteen form/state combinations. Facing follows the outgoing trail; artwork
  is never rotated.
- The mat is a level, left/right symmetrical ellipse. A slightly larger white
  plate sits beneath it, with half the mat thickness.
- The charcoal outline follows the complete outside silhouette, including the
  white plate. The gray mat/white plate junction has no internal outline.
- At display time, an SVG filter isolates the dark exterior outline and renders
  it in player-outline green (#435c50) at 22% opacity, with a soft 28% shadow.
  Wall, holds, mat and white plate fills keep their original colors and opacity.
- Stage numbers remain upright white DOM text with a black outline. Images
  contain no numbers. Alpha bounds align mat width and floor position across
  variants; tall forms can have a portrait canvas.

Created with the built-in image generation tool from the approved template.
Prompt set: preserve the wall perspective, five holds, horizontal elliptical mat,
white larger base plate, uniform exterior-only charcoal outline and clean
mat/plate junction; vary only wall height and mat palette (gold / sage /
gray-blue), with transparent backgrounds and no numbers. Each height's color
variants use its generated gold form as their reference. The approved template's
surface shading is retained. `palette.json` records the earlier flat-color
revision and is not applied to these exports.

Asset URLs include `white-plate-ellipse-v2` to refresh cached artwork.
