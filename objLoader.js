import { vec3, vec4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';
import { Tri4 } from './Tri4.js';


function parseObj(text){
    const vertices = [];
    const normals = [];
    const tris = [];

    const lines = text.split("\n");

    for(const line of lines){
        const trimmedLine = line.trim();
        if(trimmedLine.length === 0 || trimmedLine.startsWith("#")){
            continue;
        }

        const parts = trimmedLine.split(/\s+/);
        const type = parts[0];
        
        switch(type){
            case "v":
                vertices.push(vec4.fromValues(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]), 1))
                break;
            case "vn":
                normals.push(vec4.fromValues(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]), 1))
                break;
            case "f": // Face
                const faceVertexData = []; // To store {vIndex, vnIndex} for each vertex of the face

                for (let i = 1; i < parts.length; i++) {
                    const facePart = parts[i];
                    const subParts = facePart.split('/'); // v, v/vt, v//vn, v/vt/vn

                    const vIndex = parseInt(subParts[0], 10) - 1; // OBJ is 1-indexed
                    // let vtIndex = (subParts.length > 1 && subParts[1]) ? parseInt(subParts[1], 10) - 1 : undefined;
                    let vnIndex = (subParts.length > 2 && subParts[2]) ? parseInt(subParts[2], 10) - 1 : undefined;
                    
                    // Handle case where normal index might be missing but implied (e.g. "f v1// v2// v3//")
                    // However, a valid OBJ requires vn_idx if there are two slashes.
                    // If only one slash (v/vt), vn_idx will be undefined here which is correct.

                    faceVertexData.push({ vIndex, vnIndex });
                }

                // Triangulate the face (handles quads or n-gons by fanning from the first vertex)
                if (faceVertexData.length >= 3) {
                    const fd0 = faceVertexData[0]; // First vertex data of the face

                    for (let i = 1; i < faceVertexData.length - 1; i++) {
                        const fd1 = faceVertexData[i];
                        const fd2 = faceVertexData[i + 1];

                        const v0_pos = vertices[fd0.vIndex];
                        const v1_pos = vertices[fd1.vIndex];
                        const v2_pos = vertices[fd2.vIndex];

                        const defaultNormal = null
                        const v0_norm = (fd0.vnIndex !== undefined && normals[fd0.vnIndex]) ? normals[fd0.vnIndex] : defaultNormal;
                        const v1_norm = (fd1.vnIndex !== undefined && normals[fd1.vnIndex]) ? normals[fd1.vnIndex] : defaultNormal;
                        const v2_norm = (fd2.vnIndex !== undefined && normals[fd2.vnIndex]) ? normals[fd2.vnIndex] : defaultNormal;

                        if (v0_pos && v1_pos && v2_pos) { // Basic check that vertex positions exist
                            tris.push(new Tri4(
                                v0_pos, v1_pos, v2_pos,
                                //vec3.fromValues((Math.floor(Math.random()*255)),Math.floor(Math.random()*255),Math.floor(Math.random()*255)),
                                vec3.fromValues(100,100,100),
                                v0_norm, v1_norm, v2_norm,
                                // Using random colors for now, you might want to get this from material files (.mtl) later
                                
                            ));
                        } else {
                            console.warn(`Skipping triangle due to invalid vertex index in face: ${parts.slice(1).join(' ')} (Original indices: ${fd0.vIndex+1}, ${fd1.vIndex+1}, ${fd2.vIndex+1})`);
                        }
                    }
                } else {
                    console.warn(`Skipping face with less than 3 vertices: ${parts.slice(1).join(' ')}`);
                }
                break;
        }
    }
    return tris;
}
export default async function loadObj(path){
    console.log("Loading object")
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to fetch OBJ file: ${response.status} ${response.statusText}`);
        }
        const objText = await response.text();
        const mesh = parseObj(objText);
        return mesh;
    } catch (error) {
        console.error(`Error loading OBJ from ${path}:`, error);
        return []; // Return empty array on error
    }
}