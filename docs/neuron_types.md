Got it. Here’s a clean iconography you can wire up in CSS/JS. Shapes are chosen so you can build them with simple CSS (borders, border-radius, transforms) without SVG if you don’t want it.

```json
[
  { "type": "Pyramidal neuron", "slug": "pyramidal", "shape": "triangle-up" },
  {
    "type": "Corticothalamic pyramidal (L6)",
    "slug": "pyramidal-l6",
    "shape": "triangle-down"
  },
  {
    "type": "Betz cell (giant pyramidal)",
    "slug": "betz",
    "shape": "triangle-up-bold"
  },
  {
    "type": "Spiny stellate (cortex)",
    "slug": "spiny-stellate",
    "shape": "diamond"
  },
  {
    "type": "Basket cell (interneuron)",
    "slug": "basket",
    "shape": "square-rounded"
  },
  {
    "type": "Chandelier / axo-axonic",
    "slug": "chandelier",
    "shape": "rect-tall"
  },
  { "type": "Martinotti", "slug": "martinotti", "shape": "triangle-up-narrow" },
  {
    "type": "Double bouquet",
    "slug": "double-bouquet",
    "shape": "chevron-down"
  },
  { "type": "Neurogliaform", "slug": "neurogliaform", "shape": "circle-small" },
  {
    "type": "Purkinje (cerebellum)",
    "slug": "purkinje",
    "shape": "semicircle-up"
  },
  {
    "type": "Cerebellar granule",
    "slug": "granule-cerebellar",
    "shape": "circle"
  },
  {
    "type": "Golgi cell (cerebellum)",
    "slug": "golgi-cerebellar",
    "shape": "pentagon"
  },
  {
    "type": "Cerebellar stellate",
    "slug": "stellate-cerebellar",
    "shape": "star-5"
  },
  { "type": "Mossy cell (hippocampus)", "slug": "mossy", "shape": "hexagon" },
  {
    "type": "Dentate granule (hippocampus)",
    "slug": "granule-dentate",
    "shape": "circle-small"
  },
  {
    "type": "Medium spiny neuron (striatum)",
    "slug": "msn",
    "shape": "diamond-rounded"
  },
  {
    "type": "Alpha motor neuron (spinal)",
    "slug": "alpha-motor",
    "shape": "trapezoid"
  },
  {
    "type": "DRG pseudounipolar sensory",
    "slug": "pseudounipolar",
    "shape": "circle-with-stem"
  },
  {
    "type": "Thalamocortical relay",
    "slug": "thalamic-relay",
    "shape": "hexagon"
  },
  { "type": "Retinal rod", "slug": "rod", "shape": "pill-vertical" },
  { "type": "Retinal cone", "slug": "cone", "shape": "triangle-up-slim" },
  {
    "type": "Retinal bipolar",
    "slug": "bipolar-retina",
    "shape": "rect-tall-rounded"
  },
  { "type": "Amacrine", "slug": "amacrine", "shape": "square" },
  {
    "type": "Horizontal (retina)",
    "slug": "horizontal-retina",
    "shape": "rect-wide"
  },
  { "type": "Retinal ganglion cell", "slug": "rgc", "shape": "donut" },
  {
    "type": "Mitral (olfactory bulb)",
    "slug": "mitral",
    "shape": "triangle-right"
  },
  {
    "type": "Tufted (olfactory bulb)",
    "slug": "tufted",
    "shape": "triangle-right-small"
  },
  {
    "type": "Dopaminergic (SNc/VTA)",
    "slug": "dopaminergic",
    "shape": "parallelogram"
  },
  {
    "type": "Cholinergic (basal forebrain)",
    "slug": "cholinergic",
    "shape": "trapezoid-inverted"
  }
]
```

### CSS build notes (1-liners)

- `triangle-up/down/right`: border trick (zero-sized box; one colored border).
- `diamond`: square rotated `transform: rotate(45deg)`.
- `square` / `rect-*`: width/height; `rect-wide` = larger width; `rect-tall` = larger height.
- `square-rounded` / `rect-*-rounded`: `border-radius: 8px–50px`.
- `circle` / `circle-small`: `border-radius: 50%` (scale via size classes).
- `pill-vertical`: tall rectangle + `border-radius: 9999px`.
- `donut`: circle with thicker `border`; or circle with inner `::after` circle (background color) to punch a hole.
- `semicircle-up`: circle with `overflow:hidden` and a covering rectangle; or use border trick.
- `chevron-down`: two borders (or `::before`/`::after`) forming a V, rotated.
- `pentagon` / `hexagon` / `star-5`: doable with `::before`/`::after` pseudo-elements; if time’s tight, ship SVG for these three.
- `parallelogram`: skew a rectangle with `transform: skewX(−20deg)`.
- `circle-with-stem`: circle plus a small absolutely-positioned rectangle as `::after`.

These are symbolic icons, not literal morphologies, but they’re consistent and readable in dashboards/graphs. Next step: I can spit out ready-to-use CSS classes and minimal HTML snippets (or an SVG sprite sheet) for this exact set.
