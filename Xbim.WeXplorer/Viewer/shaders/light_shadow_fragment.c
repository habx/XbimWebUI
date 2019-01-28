precision mediump float;

vec4 encodeFloat(float v) {
    vec4 result = vec4(1.0, 255.0, 65025.0, 16581375.0) * v;
    result = fract(result);
    result -= vec4(result.yzw / 255.0, 0.0);

    return result;
}

void main(void) {
    gl_FragColor = encodeFloat(gl_FragCoord.z * 0.5 + 0.5);
}