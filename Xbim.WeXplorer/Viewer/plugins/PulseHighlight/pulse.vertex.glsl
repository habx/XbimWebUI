attribute highp vec3 aPosition;
attribute highp vec2 aState;
attribute highp vec2 aNormal;

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
varying vec4 vColor;

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

vec3 getNormal() {
	float U = aNormal[0];
	float V = aNormal[1];
	float PI = 3.1415926535897932384626433832795;
	float lon = U / 252.0 * 2.0 * PI;
	float lat = V / 252.0 * PI;

	float x = sin(lon) * sin(lat);
	float z = cos(lon) * sin(lat);
	float y = cos(lat);
	return normalize(vec3(x, y, z));
}

void main(void) {
  int state = int(floor(aState[0] + 0.5));
  vDiscard = 0.0;

  // Hide if not highlighted state
  if (state != 253)
  {
    vDiscard = 1.0;
    vColor = vec4(0.0, 0.0, 0.0, 0.0);
    vPosition = vec3(0.0, 0.0, 0.0);
    gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec3 normal = getNormal();
  float normalRatio = 0.5 + 0.5 * dot(normal, vec3(0.0, 0.0, 1.0));

  vec4 baseColor = vec4(
	  getColor().rgb * normalRatio, 
	  uHighlightAlphaMin + (uHighlightAlphaMax - uHighlightAlphaMin) * uSin
  );

  vColor = baseColor;

  vPosition = aPosition;
  gl_Position = uPMatrix * uMVMatrix * vec4(aPosition, 1.0);
}
