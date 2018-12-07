attribute highp vec3 aPosition;
attribute highp vec2 aState;

//transformations (model view and perspective matrix)
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

//Highlighting colour
uniform vec4 uHighlightColour;

//Highlighting alpha
uniform float uHighlightAlphaMin;
uniform float uHighlightAlphaMax;

uniform float uSin;

//colour to go to fragment shader
varying vec4 vFrontColor;
varying vec4 vBackColor;

//varying position used for clipping in fragment shader
varying vec3 vPosition;
//state passed to fragment shader
varying float vDiscard;

void main(void) {
  int state = int(floor(aState[0] + 0.5));
  vDiscard = 0.0;

  // Hide if not highlighted state
  if (state != 253)
  {
    vDiscard = 1.0;
    vFrontColor = vec4(0.0, 0.0, 0.0, 0.0);
    vBackColor = vec4(0.0, 0.0, 0.0, 0.0);
    vPosition = vec3(0.0, 0.0, 0.0);
    gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  //transform data to simulate camera perspective and position
  vec3 vertex = getVertexPosition();
  vec3 normal = getNormal();
  vec3 backNormal = normal * -1.0;

  vec4 baseColor = vec4(uHighlightColour.rgb, uHighlightAlphaMin + (uHighlightAlphaMax - uHighlightAlphaMax) * uSin);

  vFrontColor = baseColor;
  vBackColor = baseColor;

  vPosition = aPosition;
  gl_Position = uPMatrix * uMVMatrix * vec4(vertex, 1.0);
}
