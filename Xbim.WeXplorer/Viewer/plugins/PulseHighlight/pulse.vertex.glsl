attribute highp vec3 aPosition;
attribute highp vec2 aNormal;

//transformations (model view and perspective matrix)
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

//varying position used for clipping in fragment shader
varying vec3 vPosition;
varying vec3 vNormal;

uniform float uZOffset;

vec2 getTextureCoordinates(int index, int size)
{
	float x = float(index - (index / size) * size);
	float y = float(index / size);
	float pixelSize = 1.0 / float(size);
	//ask for the middle of the pixel
	return vec2((x + 0.5) * pixelSize, (y + 0.5) * pixelSize);
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

void main(void) {;

  vec3 normal = getNormal();
  vNormal = normal;

  vPosition = aPosition;
  vec4 position = uPMatrix * uMVMatrix * vec4(aPosition, 1.0);

  gl_Position = vec4(position.xy, position.z + uZOffset, position.w);
}
