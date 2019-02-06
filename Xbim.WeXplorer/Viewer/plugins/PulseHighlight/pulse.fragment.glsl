precision highp float;

varying vec4 vColor;
//position in real world. This is used for clipping.
varying vec3 vPosition;
//state passed to fragment shader
varying float vDiscard;

void main(void) {
	//test if this fragment is to be discarded from vertex shader
	if (vDiscard > 0.5) discard;

	//fix wrong normals (supposing the orientation of vertices is correct but normals are flipped)
    gl_FragColor = vColor;
}
