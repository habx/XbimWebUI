/*
* This file has been generated by spacker.exe utility. Do not change this file manualy as your changes
* will get lost when the file is regenerated. Original content is located in *.c files.
*/
if (!window.xShaders) window.xShaders = {}
xShaders.pulse_fshader = " precision highp float; uniform vec4 uClippingPlane; varying vec4 vFrontColor; varying vec4 vBackColor; varying vec3 vPosition; varying float vDiscard; void main(void) { if ( vDiscard > 0.001) discard; gl_FragColor = gl_FrontFacing ? vFrontColor : vBackColor; }";
xShaders.pulse_vshader = " attribute highp vec3 aPosition; attribute highp vec2 aState; uniform mat4 uMVMatrix; uniform mat4 uPMatrix; uniform vec4 uHighlightColour; uniform float uHighlightAlphaMin; uniform float uHighlightAlphaMax; uniform float uSin; varying vec4 vFrontColor; varying vec4 vBackColor; varying vec3 vPosition; varying float vDiscard; void main(void) { int state = int(floor(aState[0] + 0.5)); vDiscard = 0.0; if (state != 253) { vDiscard = 1.0; vFrontColor = vec4(0.0, 0.0, 0.0, 0.0); vBackColor = vec4(0.0, 0.0, 0.0, 0.0); vPosition = vec3(0.0, 0.0, 0.0); gl_Position = vec4(0.0, 0.0, 0.0, 1.0); return; } vec4 baseColor = vec4(uHighlightColour.rgb, uHighlightAlphaMin + (uHighlightAlphaMax - uHighlightAlphaMin) * uSin); vFrontColor = baseColor; vBackColor = baseColor; vPosition = aPosition; gl_Position = uPMatrix * uMVMatrix * vec4(aPosition, 1.0); }";