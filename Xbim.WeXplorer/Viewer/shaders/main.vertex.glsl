attribute highp float aStyleIndex;
attribute highp vec3 aPosition;
attribute highp vec2 aState;
attribute highp vec2 aNormal;

//transformations (model view and perspective matrix)
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

// Light
uniform mat4 uShadowMapPMatrix;
uniform mat4 uShadowMapMVMatrix;

//One meter
uniform float uMeter;

//used for 3 states in x-ray rendering (no x-ray, only highlighted, only non-highlighted as semitransparent)
uniform int uRenderingMode;

//sampler with default styles
uniform highp sampler2D uStyleSampler;
uniform int uStyleTextureSize;

//sampler with user defined styles
uniform highp sampler2D uStateStyleSampler;

//Highlighting colour
uniform vec4 uHighlightColour;

//colour to go to fragment shader
varying vec4 vColor;
//varying position used for clipping in fragment shader
varying vec3 vPosition;
//state passed to fragment shader
varying float vDiscard;

varying vec4 vShadowPos;
varying vec3 vNormal;
varying vec3 vBackNormal;

const mat4 texUnitConverter = mat4(0.5, 0.0, 0.0, 0.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.5, 0.0, 0.5, 0.5, 0.5, 1.0);

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

vec4 getIdColor(float id) {
	float B = floor(id / (256.0*256.0));
	float G = floor((id - B * 256.0*256.0) / 256.0);
	float R = mod(id, 256.0);
	return vec4(R / 255.0, G / 255.0, B / 255.0, 1.0);
}

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
		int index = int(floor(aStyleIndex + 0.5));
		vec2 coords = getTextureCoordinates(index, uStyleTextureSize);
		vec4 col = texture2D(uStyleSampler, coords);
		if (uRenderingMode == 0) {
			return col;
		}

		float intensity = (col.r + col.g + col.b) / 3.0;
		return vec4(intensity, intensity, intensity, col.a);
	}

	//return colour based on restyle
	vec2 coords = getTextureCoordinates(restyle, 15);
	return texture2D(uStateStyleSampler, coords);
}

void main(void) {
	int state = int(floor(aState[0] + 0.5));
	vDiscard = 0.0;

	//HIDDEN state or xray rendering and no selection or 'x-ray visible' state
	if (state == 254 || (state == 253 && uHighlightColour.a == 0.0))
	{
		vDiscard = 1.0;
		vColor = vec4(0.0, 0.0, 0.0, 0.0);
		vPosition = vec3(0.0, 0.0, 0.0);
		gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
		return;
	}

	//transform data to simulate camera perspective and position
	vec3 vertex = aPosition;
    vNormal = getNormal();

    vShadowPos = texUnitConverter * uShadowMapPMatrix * uShadowMapMVMatrix * vec4(aPosition, 1.0);

	vec4 baseColor = vec4(1.0, 1.0, 1.0, 1.0);
	if (uRenderingMode == 2) { //x-ray mode 
		if (state == 252) { //x-ray visible
			baseColor = getColor();
		}
		else {
			baseColor = vec4(0.0, 0.0, 0.3, 0.5); //x-ray semitransparent light blue colour
		}
	}
	if (state == 253) { //highlighted
		baseColor = uHighlightColour;
	}
	if (uRenderingMode != 2) {
		baseColor = getColor();
	}

	//offset semitransparent triangles
	if (baseColor.a < 0.98 && uRenderingMode == 0)
	{
		vec3 trans = -0.002 * uMeter * normalize(vNormal);
		vertex = vertex + trans;
	}

    vColor = baseColor;
	vPosition = vertex;

	gl_Position = uPMatrix * uMVMatrix * vec4(vertex, 1.0);
}