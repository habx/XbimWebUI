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

uniform highp sampler2D uStateStyleSampler;

//varying position used for clipping in fragment shader
varying vec3 vPosition;
//state passed to fragment shader
varying float vDiscard;


vec2 getTextureCoordinates(int index, int size)
{
	float x = float(index - (index / size) * size);
	float y = float(index / size);
	float pixelSize = 1.0 / float(size);
	//ask for the middle of the pixel
	return vec2((x + 0.5) * pixelSize, (y + 0.5) * pixelSize);
}


vec4 getColor() {
	int restyle = int(floor(aState[1] + 0.5));
	if (restyle > 224) {
		return uHighlightColour;
	}

	//return colour based on restyle
	vec2 coords = getTextureCoordinates(restyle, 15);
	return texture2D(uStateStyleSampler, coords);
}

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



  vec4 baseColor = vec4(getColor().rgb, uHighlightAlphaMin + (uHighlightAlphaMax - uHighlightAlphaMin) * uSin);

  vFrontColor = baseColor;
  vBackColor = baseColor;

  vPosition = aPosition;
  gl_Position = uPMatrix * uMVMatrix * vec4(aPosition, 1.0);
}