// Pointillist software rasteriser.
// Each visible triangle is drawn as a handful of Phong-shaded points placed
// at precomputed Halton barycentric coordinates.

// Camera / projection
const FOVY = Math.PI / 6;
const F = 1 / Math.tan(FOVY / 2);
const CULLING_EPSILON = 1e-7;

// Model placement: translate, then spin about Y
const MODEL_OFFSET = [0, -20, -320];
const ROTATION_SPEED = 0.3; // radians per second

// Pointillist controls
const POINT_DENSITY = 0.2; // points per pixel-area
const MAX_SAMPLES = 64;    // max points per triangle

// Lighting (camera sits at the origin)
const LIGHT = [50, -50, -200];
const MODEL_COLOUR = 100 / 255;
const DIFFUSE = 0.8;
const SPECULAR = 0.6;
const SHININESS = 1;
const MIN_CHANNEL = 8;

// Halton (2,3) samples folded into the unit triangle, shared by all triangles
const sampleU = new Float32Array(MAX_SAMPLES);
const sampleV = new Float32Array(MAX_SAMPLES);
function halton(index, base) {
  let result = 0, f = 1 / base, i = index;
  while (i > 0) {
    result += f * (i % base);
    i = Math.floor(i / base);
    f /= base;
  }
  return result;
}
for (let s = 0; s < MAX_SAMPLES; s++) {
  let u = halton(s + 1, 2), v = halton(s + 1, 3);
  if (u + v > 1) { u = 1 - u; v = 1 - v; }
  sampleU[s] = u;
  sampleV[s] = v;
}

// Model data
let mesh = null;
let triCount = 0;
let vertNormals = null; // one normal per triangle corner

// Per-frame buffers (one entry per unique position / corner normal)
let worldPos, worldNorm, screenX, screenY, screenW;

// Viewport
let width = 0, height = 0, aspect = 1;
let depthBuffer = null;

let angle = 0;

export function initializeModelData(data) {
  mesh = data;
  triCount = data.triPos.length / 3;
  const vCount = data.positions.length / 3;

  // Resolve a normal for every triangle corner (face normal if the OBJ has none)
  vertNormals = new Float32Array(data.triPos.length * 3);
  for (let t = 0; t < triCount; t++) {
    let fx = 0, fy = 0, fz = 0, haveFace = false;
    for (let k = 0; k < 3; k++) {
      const c = t * 3 + k;
      const n = data.triNorm[c];
      if (n >= 0) {
        vertNormals[c * 3] = data.normals[n * 3];
        vertNormals[c * 3 + 1] = data.normals[n * 3 + 1];
        vertNormals[c * 3 + 2] = data.normals[n * 3 + 2];
        continue;
      }
      if (!haveFace) {
        const p = data.positions, a = data.triPos[t * 3] * 3,
              b = data.triPos[t * 3 + 1] * 3, cc = data.triPos[t * 3 + 2] * 3;
        const e1x = p[b] - p[a], e1y = p[b + 1] - p[a + 1], e1z = p[b + 2] - p[a + 2];
        const e2x = p[cc] - p[a], e2y = p[cc + 1] - p[a + 1], e2z = p[cc + 2] - p[a + 2];
        fx = e1y * e2z - e1z * e2y;
        fy = e1z * e2x - e1x * e2z;
        fz = e1x * e2y - e1y * e2x;
        haveFace = true;
      }
      vertNormals[c * 3] = fx;
      vertNormals[c * 3 + 1] = fy;
      vertNormals[c * 3 + 2] = fz;
    }
  }

  worldPos = new Float32Array(vCount * 3);
  worldNorm = new Float32Array(vertNormals.length);
  screenX = new Float32Array(vCount);
  screenY = new Float32Array(vCount);
  screenW = new Float32Array(vCount);
}

export function updateProjectionMatrix(w, h) {
  aspect = w === 0 || h === 0 ? 1 : w / h;
  if (w !== width || h !== height) {
    depthBuffer = w > 0 && h > 0 ? new Float32Array(w * h) : null;
    width = w;
    height = h;
  }
}

// Rotate + translate every vertex/normal once, then project to screen space
// (x, y in [-0.5, 0.5], w = view-space depth).
function transformVertices() {
  const c = Math.cos(angle), s = Math.sin(angle);
  const [tx, ty, tz] = MODEL_OFFSET;
  const fx = F / aspect;
  const p = mesh.positions;

  for (let i = 0, j = 0; j < p.length; i++, j += 3) {
    const x = p[j], y = p[j + 1], z = p[j + 2];
    const wx = c * x + s * z + tx;
    const wy = y + ty;
    const wz = -s * x + c * z + tz;
    worldPos[j] = wx;
    worldPos[j + 1] = wy;
    worldPos[j + 2] = wz;

    const w = -wz;
    screenW[i] = w;
    if (w > 1e-5) {
      screenX[i] = fx * wx / w * 0.5;
      screenY[i] = -F * wy / w * 0.5;
    }
  }

  for (let j = 0; j < vertNormals.length; j += 3) {
    const x = vertNormals[j], z = vertNormals[j + 2];
    worldNorm[j] = c * x + s * z;
    worldNorm[j + 1] = vertNormals[j + 1];
    worldNorm[j + 2] = -s * x + c * z;
  }
}

function drawTriangle(t, data) {
  const corner = t * 3;
  const iA = mesh.triPos[corner], iB = mesh.triPos[corner + 1], iC = mesh.triPos[corner + 2];
  if (screenW[iA] <= 1e-5 || screenW[iB] <= 1e-5 || screenW[iC] <= 1e-5) return;

  const ax = screenX[iA], ay = screenY[iA];
  const bx = screenX[iB], by = screenY[iB];
  const cx = screenX[iC], cy = screenY[iC];

  // Backface cull
  const cross = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (cross >= -CULLING_EPSILON) return;

  // Off-screen cull
  if (Math.min(ax, bx, cx) > 0.5 || Math.max(ax, bx, cx) < -0.5 ||
      Math.min(ay, by, cy) > 0.5 || Math.max(ay, by, cy) < -0.5) return;

  const nPts = Math.min(Math.floor(Math.abs(0.5 * cross) * width * height * POINT_DENSITY), MAX_SAMPLES);
  if (nPts <= 0) return;

  const aw = screenW[iA], bw = screenW[iB], cw = screenW[iC];
  const pA = iA * 3, pB = iB * 3, pC = iC * 3;
  const nA = corner * 3, nB = nA + 3, nC = nA + 6;

  for (let s = 0; s < nPts; s++) {
    const u = sampleU[s], v = sampleV[s], w = 1 - u - v;

    const ix = Math.floor((u * ax + v * bx + w * cx + 0.5) * width);
    const iy = Math.floor((u * ay + v * by + w * cy + 0.5) * height);
    if (ix < 0 || ix >= width || iy < 0 || iy >= height) continue;

    const idx = iy * width + ix;
    const depth = u * aw + v * bw + w * cw;
    if (depthBuffer[idx] <= depth) continue;
    depthBuffer[idx] = depth;

    // Interpolated world position and normal
    const px = u * worldPos[pA] + v * worldPos[pB] + w * worldPos[pC];
    const py = u * worldPos[pA + 1] + v * worldPos[pB + 1] + w * worldPos[pC + 1];
    const pz = u * worldPos[pA + 2] + v * worldPos[pB + 2] + w * worldPos[pC + 2];
    let nx = u * worldNorm[nA] + v * worldNorm[nB] + w * worldNorm[nC];
    let ny = u * worldNorm[nA + 1] + v * worldNorm[nB + 1] + w * worldNorm[nC + 1];
    let nz = u * worldNorm[nA + 2] + v * worldNorm[nB + 2] + w * worldNorm[nC + 2];
    let len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 0) { nx /= len; ny /= len; nz /= len; }

    // Phong (white light, no ambient)
    let lx = LIGHT[0] - px, ly = LIGHT[1] - py, lz = LIGHT[2] - pz;
    len = Math.sqrt(lx * lx + ly * ly + lz * lz);
    if (len > 1e-10) { lx /= len; ly /= len; lz /= len; }

    let shade = 0, spec = 0;
    const NdotL = nx * lx + ny * ly + nz * lz;
    if (NdotL > 0) {
      shade = DIFFUSE * NdotL * MODEL_COLOUR;

      let vx = -px, vy = -py, vz = -pz;
      len = Math.sqrt(vx * vx + vy * vy + vz * vz);
      if (len > 1e-10) { vx /= len; vy /= len; vz /= len; }

      const twoNL = 2 * NdotL;
      const RdotV = (twoNL * nx - lx) * vx + (twoNL * ny - ly) * vy + (twoNL * nz - lz) * vz;
      if (RdotV > 0) spec = SPECULAR * Math.pow(RdotV, SHININESS);
    }

    const value = Math.max(MIN_CHANNEL, Math.min(255, (shade + spec) * 255));
    const o = idx << 2;
    data[o] = data[o + 1] = data[o + 2] = value;
    data[o + 3] = 255;
  }
}

/**
 * Advance the rotation by dt seconds and draw into imageData.
 * Returns false if nothing could be drawn (no model / zero-size canvas).
 */
export function renderScene(imageData, dt) {
  const data = imageData.data;
  new Uint32Array(data.buffer).fill(0);
  if (!mesh || !depthBuffer || imageData.width !== width || imageData.height !== height) {
    return false;
  }

  depthBuffer.fill(Infinity);
  angle += ROTATION_SPEED * dt;

  transformVertices();
  for (let t = 0; t < triCount; t++) drawTriangle(t, data);
  return true;
}
