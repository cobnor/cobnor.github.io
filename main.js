import { renderScene, initializeModelData, updateProjectionMatrix } from './rasteriser.js';
import loadObj from './objLoader.js';

const MODEL_PATH = './assets/lucy_extradecimated.obj';
const MAX_DT = 0.1; // seconds; avoids a jump after the tab was hidden

const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const loader = document.getElementById('loader');

let imageData = null;

function resizeCanvas() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (imageData && w === canvas.width && h === canvas.height) return;
  canvas.width = w;
  canvas.height = h;
  imageData = w > 0 && h > 0 ? ctx.createImageData(w, h) : null;
  updateProjectionMatrix(w, h);
}

function hideLoader() {
  loader.classList.add('done');
  setTimeout(() => loader.remove(), 1000); // after the 0.6s CSS fade
}

async function app() {
  try {
    initializeModelData(await loadObj(MODEL_PATH));
  } catch (err) {
    console.error(err);
    hideLoader();
    return;
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  let last = performance.now();
  let firstFrame = true;
  function animate(now) {
    const dt = Math.min((now - last) / 1000, MAX_DT);
    last = now;
    if (imageData && renderScene(imageData, dt)) {
      ctx.putImageData(imageData, 0, 0);
      if (firstFrame) {
        firstFrame = false;
        hideLoader();
      }
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

app();
