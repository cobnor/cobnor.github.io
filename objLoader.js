// Minimal OBJ parser: positions, normals and (fan-triangulated) faces.
// Returns flat typed arrays so the rasteriser never touches per-vertex objects.

function parseObj(text) {
  const positions = [];
  const normals = [];
  const triPos = [];   // 3 position indices per triangle
  const triNorm = [];  // 3 normal indices per triangle (-1 = none)

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line[0] === '#') continue;

    const parts = line.split(/\s+/);
    switch (parts[0]) {
      case 'v':
        positions.push(+parts[1], +parts[2], +parts[3]);
        break;
      case 'vn':
        normals.push(+parts[1], +parts[2], +parts[3]);
        break;
      case 'f': {
        // Each corner is v, v/vt, v//vn or v/vt/vn (1-indexed)
        const corners = parts.slice(1).map(p => {
          const [v, , vn] = p.split('/');
          return [parseInt(v, 10) - 1, vn ? parseInt(vn, 10) - 1 : -1];
        });
        for (let i = 1; i < corners.length - 1; i++) {
          for (const [v, vn] of [corners[0], corners[i], corners[i + 1]]) {
            triPos.push(v);
            triNorm.push(vn);
          }
        }
        break;
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    triPos: new Uint32Array(triPos),
    triNorm: new Int32Array(triNorm),
  };
}

export default async function loadObj(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  }
  return parseObj(await response.text());
}
