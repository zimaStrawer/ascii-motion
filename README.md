# ASCII Motion

An interactive, SVG-based character motion viewer. Four scenes are assembled from reusable glyph outlines and frame data rather than raster video.

## Structure

- `dist/index.html` — the complete interface
- `dist/styles.css` — layout, responsive states, controls, and glyph guides
- `dist/app.js` — scene loading, SVG composition, playback, seeking, and guide overlays
- `dist/assets/glyph-motion/*.json` — glyph atlases and frame data

Serve `dist` with any static HTTP server. The animation plays once, can be scrubbed frame by frame, and respects reduced-motion preferences.
