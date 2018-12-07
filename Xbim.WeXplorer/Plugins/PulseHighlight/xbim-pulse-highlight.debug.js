/**
 * This is constructor of the Navigation Cube plugin for {@link xViewer xBIM Viewer}. It gets optional Image as an argument.
 * The image will be used as a texture of the navigation cube. If you don't specify eny image default one will be used.
 * Image has to be square and its size has to be power of 2.
 * @name xPulseHighlight
 * @constructor
 * @classdesc This is a plugin for xViewer which renders interactive navigation cube. It is customizable in terms of alpha
 * behaviour and its position on the viewer canvas. Use of plugin:
 *
 *     var cube = new xPulseHighlight();
 *     viewer.addPlugin(cube);
 *
 * You can specify your own texture of the cube as an [Image](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/Image)
 * object argumen in constructor. If you don't specify any image default texture will be used (you can also use this one and enhance it if you want):
 *
 * ![Cube texture](cube_texture.png)
 *
 * @param {Image} [image = null] - optional image to be used for a cube texture.
*/
function xPulseHighlight(image) {
    this._image = image;

    this._initialized = false;

    /**
    * Min alpha of the pulse effect
    * @member {Number} xPulseHighlight#pulseAlphaMin
    */
    this.pulseAlphaMin = 0.2;

    /**
    * Max alpha of the pulse effect
    * @member {Number} xPulseHighlight#pulseAlphaMin
    */
    this.pulseAlphaMax = 0.8;

    /**
    * Period of the pulse (in seconds)
    * @member {Number} xPulseHighlight#highlighting
    */
    this.period = 1.5;
}

xPulseHighlight.prototype.init = function (xviewer) {
    var self = this;
    this.viewer = xviewer;
    var gl = this.viewer._gl;

    //create own shader
    this._shader = null;
    this._initShader();

    this._alphaMin = this.pulseAlphaMin;
    this._alphaMax = this.pulseAlphaMax;
    this._period = this.period * 1000;

    //set own shader for init
    gl.useProgram(this._shader);

    //create uniform and attribute pointers
    this._alphaMinUniformPointer = gl.getUniformLocation(this._shader, "uAlphaMin");
    this._alphaMaxUniformPointer = gl.getUniformLocation(this._shader, "uAlphaMax");
    this._sinUniformPointer = gl.getUniformLocation(this._shader, "uSin");

    //reset original shader program
    gl.useProgram(this.viewer._shaderProgram);

    this._initialized = true;
}

xPulseHighlight.prototype.onBeforeDraw = function () { };

xPulseHighlight.prototype.onBeforePick = function () { };

xPulseHighlight.prototype.onAfterDraw = function() {
    var gl = this.setActive();

    gl.uniform1f(this._alphaMinUniformPointer, this._alphaMin);
    gl.uniform1f(this._alphaMaxUniformPointer, this._alphaMax);
    gl.uniform1f(this._sinUniformPointer, Math.sin(Math.PI * (Date.now() % this._period) / this._period));

    this.draw();

    this.setInactive();
};

xPulseHighlight.prototype.onBeforeDrawId = function () { };

xPulseHighlight.prototype.onAfterDrawId = function () { };

xPulseHighlight.prototype.onBeforeGetId = function() { }

xPulseHighlight.prototype.setActive = function() {
    var gl = this.viewer._gl;
    //set own shader
    gl.useProgram(this._shader);

    return gl;
};

xPulseHighlight.prototype.setInactive = function () {
    var gl = this.viewer._gl;
    //set viewer shader
    gl.useProgram(this.viewer._shaderProgram);
};

xPulseHighlight.prototype.draw = function() {
    if (!this._initialized) return;
    var gl = this.viewer._gl;

    gl.disable(gl.DEPTH_TEST);
    this.viewer._handles.forEach(this.drawHandle.bind(this))
    gl.enable(gl.DEPTH_TEST);
}

xPulseHighlight.prototype.drawHandle = function (handle) {
    var gl = this.viewer._gl;

    if (handle.stopped) return;

    handle.setActive(this._pointers);

    const spans = []

    const currentSpan = []

    for (var i = 0; i < handle._model.states.length; i += 2) {
        if (handle._model.states[i] === xState.HIGHLIGHTED) {
            var index = i / 2;
            if (!currentSpan.length) {
                currentSpan[0] = index
                currentSpan[1] = index
            } else if (currentSpan[1] === index - 1) {
                currentSpan[1] = index
            } else {
                currentSpan[1] += 1
                spans.push(currentSpan)
                currentSpan = [index, index]
            }
        }
    }

    if (currentSpan.length) {
        currentSpan[1] += 1
        spans.push(currentSpan)
    }

    if (spans.length) {
        spans.forEach(function (span) {
            gl.drawArrays(gl.TRIANGLES, span[0], span[1] - span[0]);
        }, handle);
    }
};

xPulseHighlight.prototype._initShader = function () {

    var gl = this.viewer._gl;
    var viewer = this.viewer;
    var compile = function (shader, code) {
        gl.shaderSource(shader, code);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            viewer._error(gl.getShaderInfoLog(shader));
            return null;
        }
    }

    //fragment shader
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    compile(fragmentShader, xShaders.pulse_fshader);

    //vertex shader (the more complicated one)
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    compile(vertexShader, xShaders.pulse_vshader);

    //link program
    this._shader = gl.createProgram();
    gl.attachShader(this._shader, vertexShader);
    gl.attachShader(this._shader, fragmentShader);
    gl.linkProgram(this._shader);

    if (!gl.getProgramParameter(this._shader, gl.LINK_STATUS)) {
        viewer._error('Could not initialise shaders for pulse highlight plugin');
    }
};
