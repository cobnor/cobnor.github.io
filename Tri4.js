import { vec3, vec4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';

export class Tri4 {
	constructor(a, b, c, colour = null, aNorm = null, bNorm = null, cNorm = null) {
		this.a = vec4.clone(a);
		this.b = vec4.clone(b);
		this.c = vec4.clone(c);
		this.colour = vec3.clone(colour);

		if(!aNorm) this.aNorm = null;
		else this.aNorm = vec4.clone(aNorm);
	
		if(!bNorm) this.bNorm = null;
		else this.bNorm = vec4.clone(bNorm);

		if(!cNorm) this.cNorm = null;
		else this.cNorm = vec4.clone(cNorm);

	}

	// Return all three vertices as an array
	vertices() {
		return [this.a, this.b, this.c];
	}

}