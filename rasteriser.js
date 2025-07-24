import { vec2, vec3, vec4, mat4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';

const mvpMatrix = mat4.create();
const tempClip = new Float32Array(4);
const projectedVertices = [], visibleTriangles = [];

let depthBuffer = null;
let lastCanvasWidth = -1, lastCanvasHeight = -1;

// Constants
const FOVY = Math.PI / 6;
const NEAR_PLANE = 0.1;
const FAR_PLANE = 100.0;
const CULLING_EPSILON = 1e-7;
const ROTATION_SPEED = 0.005;

// Pointillist controls
const POINT_DENSITY = 0.2;          // points per pixel‑area
const MAX_SAMPLES = 64;              // precomputed per triangle

// Matrices
const projectionMatrix = mat4.create();
const modelMatrix      = mat4.create();
const viewMatrix       = mat4.create();
const normalMatrix     = mat4.create();
const modelViewMatrix  = mat4.create();

mat4.translate(modelMatrix, modelMatrix, vec3.fromValues(0, -20, -320));
mat4.identity(viewMatrix);

// Model data
let currentModelTris = [];
let sampleBary = [];  // sampleBary[triIndex] = array of {u,v}

// Lights & materials
const lightPositions = [[50, -50, -200]];
const cameraPosition = [0,0,0];
const ambientColour   = [1,1,1];
const diffuseColours  = [[1,1,1]];
const specularColours = [[1,1,1]];
const ambientReflection  = 0.0;
const diffuseReflection  = 0.8;
const specularReflection = 0.6;
const shininess          = 1;
const baseAmbientColour = ambientColour.map(c => c * ambientReflection);

// Buffers
let vertexBuffer, normalBuffer, colourBuffer, indexBuffer;

// Temp storage
const tempWorldPos    = vec4.create();
const tempWorldNormal = vec3.create();
const worldPos        = new Float32Array(3);
const worldNormal     = new Float32Array(3);
const dirToCamera     = new Float32Array(3);
const lightDir        = new Float32Array(3);
const reflectionVec   = new Float32Array(3);

/**
 * Halton sequence, index>=1, base>=2
 */
function halton(index, base) {
  let result = 0, f = 1/ base, i = index;
  while (i > 0) {
    result += f * (i % base);
    i = Math.floor(i / base);
    f /= base;
  }
  return result;
}

export function initializeModelData(triangles) {
  currentModelTris = triangles || [];
  sampleBary.length = 0;

  if (!currentModelTris.length) return;

  // precompute barycentric samples per triangle
  for (let t = 0; t < currentModelTris.length; t++) {
    const arr = [];
    for (let s = 1; s <= MAX_SAMPLES; s++) {
      let u = halton(s,2), v = halton(s,3);
      if (u + v > 1) { u = 1 - u; v = 1 - v; }
      arr.push({u,v});
    }
    sampleBary.push(arr);
  }

  // flatten into buffers
  const vCount = currentModelTris.length * 3;
  vertexBuffer = new Float32Array(vCount * 4);
  normalBuffer = new Float32Array(vCount * 4);
  colourBuffer = new Float32Array(currentModelTris.length * 3);
  indexBuffer  = new Uint32Array(currentModelTris.length * 3);

  let vi=0, ni=0, ci=0, ii=0;
  for (let t = 0; t < currentModelTris.length; t++) {
    const tri = currentModelTris[t];
    // A, B, C
    [tri.a,tri.b,tri.c].forEach(v => {
      vertexBuffer[vi++] = v[0]; vertexBuffer[vi++] = v[1];
      vertexBuffer[vi++] = v[2]; vertexBuffer[vi++] = v[3]||1;
    });
    // Normals
    [tri.aNorm||[1,1,1,0],tri.bNorm||[1,1,1,0],tri.cNorm||[1,1,1,0]]
      .forEach(n => { normalBuffer[ni++]=n[0]; normalBuffer[ni++]=n[1];
                      normalBuffer[ni++]=n[2]; normalBuffer[ni++]=n[3]; });
    // Colour
    colourBuffer[ci++] = tri.colour[0]/255;
    colourBuffer[ci++] = tri.colour[1]/255;
    colourBuffer[ci++] = tri.colour[2]/255;
    // Indices
    ii = t*3;
    indexBuffer[ii  ] = ii;
    indexBuffer[ii+1] = ii+1;
    indexBuffer[ii+2] = ii+2;
  }
}

export function updateProjectionMatrix(w,h) {
  const aspect = w===0||h===0 ? 1 : w/h;
  mat4.perspective(projectionMatrix, FOVY, aspect, NEAR_PLANE, FAR_PLANE);
  if (w !== lastCanvasWidth || h !== lastCanvasHeight) {
    depthBuffer = (w>0&&h>0) ? new Float32Array(w*h) : null;
    lastCanvasWidth = w; lastCanvasHeight = h;
  }
}

function batchTransformVertices() {
  if (!vertexBuffer) return [];
  mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
  mat4.multiply(mvpMatrix, projectionMatrix, modelViewMatrix);
  mat4.invert(normalMatrix, modelMatrix);
  mat4.transpose(normalMatrix, normalMatrix);

  projectedVertices.length = 0;
  const vc = vertexBuffer.length/4;
  for (let i=0; i<vc; i++) {
    const base = i*4;
    tempClip[0]=vertexBuffer[base];
    tempClip[1]=vertexBuffer[base+1];
    tempClip[2]=vertexBuffer[base+2];
    tempClip[3]=vertexBuffer[base+3];
    vec4.transformMat4(tempClip, tempClip, mvpMatrix);
    const w = tempClip[3];
    if (w>1e-5) {
      const invW = 1/w;
      projectedVertices.push({
        x: tempClip[0]*invW*0.5,
        y: tempClip[1]*invW*-0.5,
        z: w, valid:true
      });
    } else projectedVertices.push({valid:false});
  }
  return projectedVertices;
}

function phongIllumination(wP, wN, triCol) {
  let r=baseAmbientColour[0]*triCol[0],
      g=baseAmbientColour[1]*triCol[1],
      b=baseAmbientColour[2]*triCol[2];

  // view dir
  dirToCamera[0]=cameraPosition[0]-wP[0];
  dirToCamera[1]=cameraPosition[1]-wP[1];
  dirToCamera[2]=cameraPosition[2]-wP[2];
  let L = Math.hypot(...dirToCamera);
  if (L>1e-10) dirToCamera.forEach((v,i)=>dirToCamera[i]/=L);

  lightPositions.forEach((lightPos,i)=> {
    // light dir
    lightDir[0]=lightPos[0]-wP[0];
    lightDir[1]=lightPos[1]-wP[1];
    lightDir[2]=lightPos[2]-wP[2];
    L = Math.hypot(...lightDir);
    if (L>1e-10) lightDir.forEach((v,i)=>lightDir[i]/=L);

    const NdotL = Math.max(0,
      wN[0]*lightDir[0]+wN[1]*lightDir[1]+wN[2]*lightDir[2]
    );
    if (NdotL>0) {
      const [dR,dG,dB] = diffuseColours[i];
      r += diffuseReflection*NdotL*dR*triCol[0];
      g += diffuseReflection*NdotL*dG*triCol[1];
      b += diffuseReflection*NdotL*dB*triCol[2];
      // spec
      const twoNL = 2*NdotL;
      reflectionVec[0]=twoNL*wN[0]-lightDir[0];
      reflectionVec[1]=twoNL*wN[1]-lightDir[1];
      reflectionVec[2]=twoNL*wN[2]-lightDir[2];
      const RdotV = Math.max(0,
        reflectionVec[0]*dirToCamera[0]+
        reflectionVec[1]*dirToCamera[1]+
        reflectionVec[2]*dirToCamera[2]
      );
      if (RdotV>0){
        const specF = Math.pow(RdotV, shininess);
        const [sR,sG,sB] = specularColours[i];
        r += specularReflection*specF*sR;
        g += specularReflection*specF*sG;
        b += specularReflection*specF*sB;
      }
    }
  });

  return [
    Math.max(8,Math.min(255,r*255)),
    Math.max(8,Math.min(255,g*255)),
    Math.max(8,Math.min(255,b*255))
  ];
}

function processTriangles(pv) {
  visibleTriangles.length=0;
  const tCount = indexBuffer.length/3;
  for (let t=0; t<tCount; t++) {
    const i0=indexBuffer[3*t], i1=indexBuffer[3*t+1], i2=indexBuffer[3*t+2];
    const vA=pv[i0], vB=pv[i1], vC=pv[i2];
    if (!vA.valid||!vB.valid||!vC.valid) continue;
    // backface
    const ex1=vB.x-vA.x, ey1=vB.y-vA.y,
          ex2=vC.x-vA.x, ey2=vC.y-vA.y;
    const area2 = ex1*ey2 - ey1*ex2;
    if (area2 >= -CULLING_EPSILON) continue;
    // bounds
    if (Math.min(vA.x,vB.x,vC.x)>0.5 ||
        Math.max(vA.x,vB.x,vC.x)<-0.5 ||
        Math.min(vA.y,vB.y,vC.y)>0.5 ||
        Math.max(vA.y,vB.y,vC.y)<-0.5) continue;
    visibleTriangles.push({vA,vB,vC, triIndex: t});
  }
  return visibleTriangles;
}

/**
 * Point‑sample using precomputed barycentrics
 */
function pointillizeTriangle(tri, data, width, height) {
  const {vA,vB,vC,triIndex} = tri;
  // screen area
  const area2 = 0.5*((vB.x-vA.x)*(vC.y-vA.y)-(vB.y-vA.y)*(vC.x-vA.x));
  const nPts = Math.min(
    Math.floor(Math.abs(area2)*width*height*POINT_DENSITY),
    sampleBary[triIndex].length
  );
  if (nPts<=0) return;

  const baseI = triIndex*3;
  const cOff  = baseI;
  const col   = [
    colourBuffer[cOff],
    colourBuffer[cOff+1],
    colourBuffer[cOff+2]
  ];
  const vOff4 = baseI*4;

  for (let s=0; s<nPts; s++) {
    const {u,v} = sampleBary[triIndex][s];
    const w = 1-u-v;
    // screen pos
    const pxN = u*vA.x + v*vB.x + w*vC.x;
    const pyN = u*vA.y + v*vB.y + w*vC.y;
    const depth = u*vA.z + v*vB.z + w*vC.z;
    const ix = Math.floor((pxN+0.5)*width),
          iy = Math.floor((pyN+0.5)*height);
    if (ix<0||ix>=width||iy<0||iy>=height) continue;
    const dIdx = iy*width + ix;
    if (depthBuffer[dIdx] <= depth) continue;
    depthBuffer[dIdx] = depth;
    // world pos
    tempWorldPos[0] = u*vertexBuffer[vOff4]   + v*vertexBuffer[vOff4+4]   + w*vertexBuffer[vOff4+8];
    tempWorldPos[1] = u*vertexBuffer[vOff4+1] + v*vertexBuffer[vOff4+5]   + w*vertexBuffer[vOff4+9];
    tempWorldPos[2] = u*vertexBuffer[vOff4+2] + v*vertexBuffer[vOff4+6]   + w*vertexBuffer[vOff4+10];
    tempWorldPos[3] = 1;
    vec4.transformMat4(tempWorldPos, tempWorldPos, modelMatrix);
    // world normal
    tempWorldNormal[0] = u*normalBuffer[vOff4]   + v*normalBuffer[vOff4+4]   + w*normalBuffer[vOff4+8];
    tempWorldNormal[1] = u*normalBuffer[vOff4+1] + v*normalBuffer[vOff4+5]   + w*normalBuffer[vOff4+9];
    tempWorldNormal[2] = u*normalBuffer[vOff4+2] + v*normalBuffer[vOff4+6]   + w*normalBuffer[vOff4+10];
    vec3.transformMat4(tempWorldNormal, tempWorldNormal, normalMatrix);
    vec3.normalize(tempWorldNormal, tempWorldNormal);
    // shade
    const [r,g,b] = phongIllumination(
      [tempWorldPos[0],tempWorldPos[1],tempWorldPos[2]],
      tempWorldNormal,
      col
    );
    const pixOff = (iy*width + ix)<<2;
    data[pixOff  ] = r;
    data[pixOff+1] = g;
    data[pixOff+2] = b;
    data[pixOff+3] = 255;
  }
}

export function renderScene(imageData, width, height) {
  if (!vertexBuffer || !depthBuffer ||
      width !== lastCanvasWidth || height !== lastCanvasHeight) {
    // clear
    const d = imageData.data;
    for (let i=0;i<d.length;i+=4) {
      d[i]=d[i+1]=d[i+2]=0; d[i+3]=255;
    }
    return;
  }
  depthBuffer.fill(Infinity);
  const data = imageData.data;
  for (let i=0;i<data.length;i+=4) data[i+3]=0;

  mat4.rotateY(modelMatrix, modelMatrix, ROTATION_SPEED);

  const pv = batchTransformVertices();
  if (!pv.length) return;
  const tris = processTriangles(pv);
  if (!tris.length) return;
  for (const tri of tris) pointillizeTriangle(tri, data, width, height);
}
