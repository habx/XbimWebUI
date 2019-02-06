attribute highp vec3 aPosition;

uniform mat4 uShadowMapPMatrix;
uniform mat4 uShadowMapMVMatrix;

void main(void) {
    gl_Position = uShadowMapPMatrix * uShadowMapMVMatrix * vec4(aPosition, 1.0);
}