attribute highp vec3 aPosition;

uniform mat4 uLightPMatrix;
uniform mat4 uLightMVMatrix;

void main(void) {
    gl_Position = uLightPMatrix * uLightMVMatrix * vec4(aPosition, 1.0);
}