import { vec3, vec4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';
import { renderScene, initializeModelData, updateProjectionMatrix } from "./rasteriser.js";
import { Tri4 } from './Tri4.js';
import loadObj from './objLoader.js';

// ----- Default Cube Data (unchanged) -----
const s = 0.5;
const defaultVertices = [
  vec4.fromValues(-s, -s, -s, 1), vec4.fromValues(s, -s, -s, 1),
  vec4.fromValues(s, s, -s, 1),   vec4.fromValues(-s, s, -s, 1),
  vec4.fromValues(-s, -s, s, 1),  vec4.fromValues(s, -s, s, 1),
  vec4.fromValues(s, s, s, 1),    vec4.fromValues(-s, s, s, 1)
];
const colours = {
  red:     vec3.fromValues(255,   0,   0),
  red2:    vec3.fromValues(128,   0,   0),
  green:   vec3.fromValues(  0, 255,   0),
  green2:  vec3.fromValues(  0, 128,   0),
  blue:    vec3.fromValues(  0,   0, 255),
  blue2:   vec3.fromValues(  0,   0, 128),
  yellow:  vec3.fromValues(255, 255,   0),
  yellow2: vec3.fromValues(128, 128,   0),
  magenta: vec3.fromValues(255,   0, 255),
  magenta2:vec3.fromValues(128,   0, 128),
  cyan:    vec3.fromValues(  0, 255, 255),
  cyan2:   vec3.fromValues(  0, 128, 128)
};
const defaultCubeTriangles = [
  new Tri4(defaultVertices[4], defaultVertices[5], defaultVertices[6], colours.red),
  new Tri4(defaultVertices[4], defaultVertices[6], defaultVertices[7], colours.red2),
  new Tri4(defaultVertices[0], defaultVertices[3], defaultVertices[2], colours.green),
  new Tri4(defaultVertices[0], defaultVertices[2], defaultVertices[1], colours.green2),
  new Tri4(defaultVertices[3], defaultVertices[7], defaultVertices[6], colours.blue),
  new Tri4(defaultVertices[3], defaultVertices[6], defaultVertices[2], colours.blue2),
  new Tri4(defaultVertices[0], defaultVertices[1], defaultVertices[5], colours.yellow),
  new Tri4(defaultVertices[0], defaultVertices[5], defaultVertices[4], colours.yellow2),
  new Tri4(defaultVertices[1], defaultVertices[2], defaultVertices[6], colours.magenta),
  new Tri4(defaultVertices[1], defaultVertices[6], defaultVertices[5], colours.magenta2),
  new Tri4(defaultVertices[0], defaultVertices[4], defaultVertices[7], colours.cyan),
  new Tri4(defaultVertices[0], defaultVertices[7], defaultVertices[3], colours.cyan2)
];
// ----- End Default Cube Data -----

async function app() {
  // Model load (unchanged)...
  let modelToRender = null;
  try {
    const loaded = await loadObj("./assets/lucy_extradecimated.obj");
    modelToRender = (loaded && loaded.length>0) ? loaded : defaultCubeTriangles;
  } catch {
    modelToRender = defaultCubeTriangles;
  }
  initializeModelData(modelToRender);

  // Canvas & context
  const canvas = document.getElementById('mainCanvas');
  if (!canvas) throw new Error("Canvas #mainCanvas not found");
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("2D context not available");

  // These will be updated by resizeCanvas():
  let bufferWidth, bufferHeight, imageData;

  // Re‑size everything: canvas buffer, ImageData, projection & depth buffer
  function resizeCanvas() {
    // 1) CSS size in CSS pixels:
    const displayWidth  = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    // 2) Match drawing buffer to display size:
    canvas.width  = displayWidth;
    canvas.height = displayHeight;

    // 3) Update our locals:
    bufferWidth  = displayWidth;
    bufferHeight = displayHeight;

    // 4) New RGBA buffer to render into:
    imageData = ctx.createImageData(bufferWidth, bufferHeight);

    // 5) Tells rasteriser to rebuild projection & depth buffer:
    updateProjectionMatrix(bufferWidth, bufferHeight);
  }

  // Initial setup:
  resizeCanvas();

  // Re‑resize on any window/container change:
  window.addEventListener('resize', resizeCanvas);

  // Animation loop:
  let lastFrameTime = performance.now();
  let frameCount = 0;
  function animate(now) {
    const deltaMs = now - lastFrameTime;
    if (deltaMs >= 10) {
      lastFrameTime = now;
      if (frameCount % 60 === 0) {
        const fps = (1000 / deltaMs).toFixed(1);
        console.log(`FPS = ${fps}`);
      }
      // Render into the up‑to‑date ImageData:
      renderScene(imageData, bufferWidth, bufferHeight);
      // Blit to screen:
      ctx.putImageData(imageData, 0, 0);
      frameCount++;
    }
    requestAnimationFrame(animate);
  }

  console.log("Starting animation");
  requestAnimationFrame(animate);
}

// Start when DOM ready
window.addEventListener('load', () => {
  app().catch(err => console.error(err));
});
