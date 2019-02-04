precision mediump float;

uniform vec4 uClippingPlaneA;
uniform vec4 uClippingPlaneB;
uniform bool uClippingA;
uniform bool uClippingB;

uniform float uShadowBias;
uniform float uShadowMapSize;


varying vec4 vFrontColor;
varying vec4 vBackColor;
//position in real world. This is used for clipping.
varying vec3 vPosition;
//state passed to fragment shader
varying float vDiscard;

varying vec4 shadowPos;

uniform sampler2D uDepthColorTexture;
uniform bool uShadowEnabled;

float decodeFloat(vec4 v) {
    return dot(v, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0));
}

float shadowDepth(sampler2D shadowSampler, vec2 uv)
{
    float depth = decodeFloat(texture2D(shadowSampler, uv));

    return depth;
}

float shadowPCF(vec3 vertexPos) {
    float depth = vertexPos.z - uShadowBias;
    float texelSize = 1.0 / uShadowMapSize;
    float shadow = 0.0;

    for (int x = -1; x <= 1; x++) {
        for (int y = 1; y <= 1; y++) {
            float texelDepth = shadowDepth(uDepthColorTexture, shadowPos.xy + vec2(x, y) * texelSize);

            if (depth < texelDepth) {
                shadow += 1.0;
            }
        }
    }
    shadow /= 9.0;

    shadow = min(1.0, shadow + 0.6);

    return shadow;
}


void main(void) {
	//test if this fragment is to be discarded from vertex shader
	if ( vDiscard > 0.5) discard;
	
	//test if clipping plane is defined
	if (uClippingA)
	{
		//clipping test
		vec4 p = uClippingPlaneA;
		vec3 x = vPosition;
		float distance = (dot(p.xyz, x) + p.w) / length(p.xyz);
		if (distance < 0.0){
			discard;
		}
		
	}

	//test if clipping plane is defined
	if (uClippingB)
	{
		//clipping test
		vec4 p = uClippingPlaneB;
		vec3 x = vPosition;
		float distance = (dot(p.xyz, x) + p.w) / length(p.xyz);
		if (distance < 0.0) {
			discard;
		}

	}

    float shadow = 1.0;

    if (uShadowEnabled) {
        shadow = shadowPCF(shadowPos.xyz);
    }
	
	//fix wrong normals (supposing the orientation of vertices is correct but normals are flipped)

    vec4 color = gl_FrontFacing ? vFrontColor : vBackColor;

	gl_FragColor = vec4(shadow * color.xyz, color.a);
}