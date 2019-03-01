precision highp float;

//Highlighting colour
uniform vec4 uHighlightColor;
uniform vec4 uHighlightColor2;

//Highlighting alpha
uniform float uHighlightAlphaMin;
uniform float uHighlightAlphaMax;

uniform float uSin;

//position in real world. This is used for clipping.
varying vec3 vPosition;
varying vec3 vNormal;

void main(void) {
    float normalRatio = 0.5 + 0.5 * dot(vNormal, vec3(0.0, 0.0, 1.0));

    vec3 highlightColor = mix(uHighlightColor.rgb, uHighlightColor2.rgb, uSin);

    vec4 baseColor = vec4(
	    highlightColor * normalRatio, 
	    uHighlightAlphaMin + (uHighlightAlphaMax - uHighlightAlphaMin) * uSin
    );

	//fix wrong normals (supposing the orientation of vertices is correct but normals are flipped)
    gl_FragColor = baseColor;
}
