attribute highp vec3 aPosition;
attribute highp vec2 aState;

uniform mat4 uShadowMapPMatrix;
uniform mat4 uShadowMapMVMatrix;

varying float vDiscard;

void main(void) {
	int state = int(floor(aState[0] + 0.5));
	vDiscard = 0.0;

	if (state == 254 || state == 253)
	{
		vDiscard = 1.0;
		gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
		return;
	}

    gl_Position = uShadowMapPMatrix * uShadowMapMVMatrix * vec4(aPosition, 1.0);
}