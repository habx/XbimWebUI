precision highp float;

uniform float uShadowBias;
uniform float uShadowMapSize;

uniform float uDirectionalLight1Diffuse;
uniform vec3 uDirectionalLight1Color;
uniform vec3 uDirectionalLight1Direction;

uniform float uDirectionalLight2Diffuse;
uniform vec3 uDirectionalLight2Color;
uniform vec3 uDirectionalLight2Direction;

uniform float uAmbientLightDiffuse;
uniform vec3 uAmbientLightColor;

varying vec4 vColor;
varying vec3 vNormal;
//position in real world. This is used for clipping.
varying vec3 vPosition;

varying vec4 vShadowPos;

uniform highp sampler2D uShadowMapSampler;
uniform bool uShadowEnabled;
uniform float uShadowIntensity;

float decodeFloat(vec4 v) {
    return dot(v, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0));
}

float shadowDepth(sampler2D shadowSampler, vec2 uv)
{
    float depth = decodeFloat(texture2D(shadowSampler, uv));

    return depth;
}

float shadowDepthCompare(sampler2D shadowSampler, vec2 uv, float depth) {
    return step(depth, shadowDepth(shadowSampler, uv));
}

bool isInShadowMap(vec3 vertex)
{
    return all(lessThanEqual(vertex, vec3(uShadowMapSize))) && all(greaterThanEqual(vertex, vec3(0)));
}

float shadowPCF(vec3 vertexPos) {
    if (!uShadowEnabled) {
        return 1.0;
    }

    if (!isInShadowMap(vertexPos)) {
        return 1.0;
    }

    float result = 0.0;

    vec3 normal = vNormal;
    float cosTheta = clamp(dot(normal, -uDirectionalLight1Direction), 0.0, 1.0);

    float bias = uShadowBias * tan(acos(cosTheta));
    bias = clamp(bias, 0.0, 0.02);

    float depth = vertexPos.z - bias;
    float shadow = 0.0;

    float texel = 1.0 / uShadowMapSize;
    
    shadow += shadowDepthCompare(uShadowMapSampler, vertexPos.xy + vec2(texel, texel), depth);
    shadow += shadowDepthCompare(uShadowMapSampler, vertexPos.xy + vec2(texel, -texel), depth);
    shadow += shadowDepthCompare(uShadowMapSampler, vertexPos.xy + vec2(-texel, -texel), depth);
    shadow += shadowDepthCompare(uShadowMapSampler, vertexPos.xy + vec2(-texel, texel), depth);
    
    // early bailing
    if (shadow == 4.0) {
        return 1.0;
    }
    
    if (shadow == 0.0) {
        return 0.0;
    }
    
    for (int x = -1; x < 1; x++)
        shadow += shadowDepthCompare(uShadowMapSampler, vertexPos.xy + vec2(float(x) * texel, 0), depth);
    for (int y = -1; y < 1; y++)
        shadow += shadowDepthCompare(uShadowMapSampler, vertexPos.xy + vec2(0, float(y) * texel), depth);

    shadow = shadow / 9.0;

    return shadow;
}

void main(void) {
    float shadow = shadowPCF(vShadowPos.xyz);
    shadow = min(1.0, shadow + (1.0 - uShadowIntensity));

    vec3 ambient = vec3(0.0);
    vec3 diffuse = vec3(0.0);
    vec3 normal = vNormal;

    ambient += uAmbientLightColor * uAmbientLightDiffuse * shadow;
    float directionalLight1Weight = max(dot(normal, uDirectionalLight1Direction) * uDirectionalLight1Diffuse, 0.0);
    float directionalLight2Weight = max(dot(normal, uDirectionalLight2Direction) * uDirectionalLight2Diffuse, 0.0);

    //minimal constant value is for ambient light
    diffuse += directionalLight1Weight * shadow * uDirectionalLight1Diffuse * uDirectionalLight1Color;
    diffuse += directionalLight2Weight * shadow * uDirectionalLight2Diffuse * uDirectionalLight2Color;
        

    gl_FragColor = vec4(vColor.rgb * (ambient + diffuse), vColor.a);
}